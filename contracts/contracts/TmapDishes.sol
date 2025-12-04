// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IERC20.sol";
import "./libraries/BondingCurve.sol";

/**
 * @title TmapDishes
 * @notice ERC1155 token representing dish badges with bonding curve pricing
 * @dev Each tokenId represents a unique dish at a restaurant
 *
 * Key Features:
 * - Linear bonding curve: Price = supply * 0.0125 USDC
 * - $10 max spend per user per dish
 * - 70% refund rate on sells
 * - 2.5% referral fee + 2.5% holder rewards on each mint
 * - Time-weighted reward distribution for existing holders
 */
contract TmapDishes is ERC1155, Ownable, ReentrancyGuard {
    using BondingCurve for uint256;

    // ============ Constants ============

    // Maximum USDC a user can spend on a single dish ($10 with 6 decimals)
    uint256 public constant MAX_SPEND_PER_DISH = 10_000_000; // $10 USDC

    // Precision for reward calculations (18 decimals)
    uint256 private constant REWARD_PRECISION = 1e18;

    // ============ State Variables ============

    // USDC token contract
    IERC20 public immutable usdc;

    // Protocol fee recipient (receives referral fee if no referrer)
    address public protocolFeeRecipient;

    // ============ Dish Data ============

    struct Dish {
        address creator; // Original creator of the dish
        uint256 totalSupply; // Total tokens minted for this dish
        uint256 createdAt; // Timestamp of creation
        string metadata; // IPFS hash or URI for dish metadata
        bool exists; // Whether the dish has been created
    }

    // dishId => Dish data
    mapping(bytes32 => Dish) public dishes;

    // dishId => user => total USDC spent on this dish
    mapping(bytes32 => mapping(address => uint256)) public userSpent;

    // dishId => user => token balance (shadow balance for reward calculation)
    mapping(bytes32 => mapping(address => uint256)) private _balances;

    // ============ Reward System ============

    // Cumulative reward per token for each dish (scaled by REWARD_PRECISION)
    // This increases every time someone mints
    mapping(bytes32 => uint256) public rewardPerTokenStored;

    // User's reward per token checkpoint (when they last claimed or minted)
    mapping(bytes32 => mapping(address => uint256)) public userRewardPerTokenPaid;

    // User's pending rewards that haven't been claimed yet
    mapping(bytes32 => mapping(address => uint256)) public pendingRewards;

    // ============ Events ============

    event DishCreated(
        bytes32 indexed dishId,
        address indexed creator,
        string metadata,
        uint256 timestamp
    );

    event DishMinted(
        bytes32 indexed dishId,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 usdcPaid,
        address referrer,
        uint256 referralFee,
        uint256 rewardFee
    );

    event DishSold(
        bytes32 indexed dishId,
        address indexed seller,
        uint256 tokenAmount,
        uint256 usdcReceived
    );

    event RewardsClaimed(
        bytes32 indexed dishId,
        address indexed user,
        uint256 amount
    );

    event ProtocolFeeRecipientUpdated(address indexed newRecipient);

    // ============ Errors ============

    error DishAlreadyExists();
    error DishDoesNotExist();
    error ZeroAmount();
    error ExceedsMaxSpend();
    error InsufficientBalance();
    error InvalidReferrer();
    error TransferFailed();

    // ============ Constructor ============

    /**
     * @notice Initialize the TmapDishes contract
     * @param _usdc Address of the USDC token contract
     * @param _protocolFeeRecipient Address to receive protocol fees
     */
    constructor(
        address _usdc,
        address _protocolFeeRecipient
    ) ERC1155("") Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        protocolFeeRecipient = _protocolFeeRecipient;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new dish token
     * @param dishId Unique identifier for the dish (hash of restaurant + dish name)
     * @param metadata IPFS hash or URI containing dish information
     */
    function createDish(bytes32 dishId, string calldata metadata) external {
        if (dishes[dishId].exists) revert DishAlreadyExists();

        dishes[dishId] = Dish({
            creator: msg.sender,
            totalSupply: 0,
            createdAt: block.timestamp,
            metadata: metadata,
            exists: true
        });

        emit DishCreated(dishId, msg.sender, metadata, block.timestamp);
    }

    /**
     * @notice Mint dish tokens by spending USDC
     * @param dishId The dish to mint
     * @param usdcAmount Amount of USDC to spend (max $10 per user per dish)
     * @param referrer Address of the referrer (must hold tokens or be creator)
     */
    function mint(
        bytes32 dishId,
        uint256 usdcAmount,
        address referrer
    ) external nonReentrant {
        Dish storage dish = dishes[dishId];
        if (!dish.exists) revert DishDoesNotExist();
        if (usdcAmount == 0) revert ZeroAmount();

        // Check $10 cap
        uint256 alreadySpent = userSpent[dishId][msg.sender];
        uint256 remainingAllowance = MAX_SPEND_PER_DISH > alreadySpent
            ? MAX_SPEND_PER_DISH - alreadySpent
            : 0;

        if (usdcAmount > remainingAllowance) revert ExceedsMaxSpend();

        // Validate referrer (must hold tokens or be creator, or zero address)
        if (referrer != address(0)) {
            if (_balances[dishId][referrer] == 0 && referrer != dish.creator) {
                revert InvalidReferrer();
            }
        }

        // Update rewards for existing holders BEFORE changing supply
        _updateRewardsOnMint(dishId, msg.sender);

        // Calculate tokens to mint based on bonding curve
        (uint256 tokenAmount, uint256 actualCost) = BondingCurve.getTokensForUsdc(
            dish.totalSupply,
            usdcAmount
        );

        if (tokenAmount == 0) revert ZeroAmount();

        // Calculate fees
        (uint256 referralFee, uint256 rewardFee, ) = BondingCurve.calculateFees(actualCost);

        // Transfer USDC from user
        if (!usdc.transferFrom(msg.sender, address(this), actualCost)) {
            revert TransferFailed();
        }

        // Distribute referral fee
        address feeRecipient = referrer != address(0) ? referrer : protocolFeeRecipient;
        if (!usdc.transfer(feeRecipient, referralFee)) {
            revert TransferFailed();
        }

        // Add to reward pool and distribute to existing holders
        if (dish.totalSupply > 0) {
            // Distribute reward fee proportionally to all existing holders
            // rewardFee stays in contract, tracked via rewardPerTokenStored
            uint256 rewardPerToken = (rewardFee * REWARD_PRECISION) / dish.totalSupply;
            rewardPerTokenStored[dishId] += rewardPerToken;
        } else {
            // First mint - reward fee goes to protocol
            if (!usdc.transfer(protocolFeeRecipient, rewardFee)) {
                revert TransferFailed();
            }
        }

        // Update state
        userSpent[dishId][msg.sender] += actualCost;
        dish.totalSupply += tokenAmount;
        // Note: _balances is updated in _update() override when _mint is called

        // Mint ERC1155 tokens
        _mint(msg.sender, uint256(dishId), tokenAmount, "");

        emit DishMinted(
            dishId,
            msg.sender,
            tokenAmount,
            actualCost,
            referrer,
            referralFee,
            rewardFee
        );
    }

    /**
     * @notice Sell dish tokens back to the contract
     * @param dishId The dish to sell
     * @param tokenAmount Number of tokens to sell
     */
    function sell(bytes32 dishId, uint256 tokenAmount) external nonReentrant {
        Dish storage dish = dishes[dishId];
        if (!dish.exists) revert DishDoesNotExist();
        if (tokenAmount == 0) revert ZeroAmount();
        if (_balances[dishId][msg.sender] < tokenAmount) revert InsufficientBalance();

        // Update rewards before changing balance
        _updateRewards(dishId, msg.sender);

        // Calculate refund (70% of current value)
        uint256 refundAmount = BondingCurve.getSellValue(dish.totalSupply, tokenAmount);

        // Update state
        dish.totalSupply -= tokenAmount;
        // Note: _balances is updated in _update() override when _burn is called

        // Burn ERC1155 tokens
        _burn(msg.sender, uint256(dishId), tokenAmount);

        // Transfer USDC refund
        if (!usdc.transfer(msg.sender, refundAmount)) {
            revert TransferFailed();
        }

        emit DishSold(dishId, msg.sender, tokenAmount, refundAmount);
    }

    /**
     * @notice Claim accumulated rewards for a dish
     * @param dishId The dish to claim rewards for
     */
    function claimRewards(bytes32 dishId) external nonReentrant {
        _updateRewards(dishId, msg.sender);

        uint256 reward = pendingRewards[dishId][msg.sender];
        if (reward == 0) revert ZeroAmount();

        pendingRewards[dishId][msg.sender] = 0;

        if (!usdc.transfer(msg.sender, reward)) {
            revert TransferFailed();
        }

        emit RewardsClaimed(dishId, msg.sender, reward);
    }

    // ============ View Functions ============

    /**
     * @notice Get the current price for the next token of a dish
     * @param dishId The dish to query
     * @return price Current price in USDC (6 decimals)
     */
    function getCurrentPrice(bytes32 dishId) external view returns (uint256) {
        return BondingCurve.getCurrentPrice(dishes[dishId].totalSupply);
    }

    /**
     * @notice Get the cost to mint a specific number of tokens
     * @param dishId The dish to query
     * @param tokenAmount Number of tokens to mint
     * @return cost Total cost in USDC (6 decimals)
     */
    function getMintCost(bytes32 dishId, uint256 tokenAmount) external view returns (uint256) {
        return BondingCurve.getMintCost(dishes[dishId].totalSupply, tokenAmount);
    }

    /**
     * @notice Get how many tokens can be minted with a USDC amount
     * @param dishId The dish to query
     * @param usdcAmount Amount of USDC to spend
     * @return tokenAmount Number of tokens that can be minted
     * @return actualCost Actual USDC cost
     */
    function getTokensForUsdc(
        bytes32 dishId,
        uint256 usdcAmount
    ) external view returns (uint256 tokenAmount, uint256 actualCost) {
        return BondingCurve.getTokensForUsdc(dishes[dishId].totalSupply, usdcAmount);
    }

    /**
     * @notice Get the sell value for tokens
     * @param dishId The dish to query
     * @param tokenAmount Number of tokens to sell
     * @return value Refund amount in USDC (6 decimals)
     */
    function getSellValue(bytes32 dishId, uint256 tokenAmount) external view returns (uint256) {
        return BondingCurve.getSellValue(dishes[dishId].totalSupply, tokenAmount);
    }

    /**
     * @notice Get user's remaining allowance for a dish
     * @param user The user to query
     * @param dishId The dish to query
     * @return remaining Remaining USDC allowance
     */
    function getRemainingAllowance(
        address user,
        bytes32 dishId
    ) external view returns (uint256) {
        uint256 spent = userSpent[dishId][user];
        return MAX_SPEND_PER_DISH > spent ? MAX_SPEND_PER_DISH - spent : 0;
    }

    /**
     * @notice Calculate pending rewards for a user on a dish
     * @param user The user to query
     * @param dishId The dish to query
     * @return reward Pending reward amount in USDC
     */
    function calculatePendingRewards(
        address user,
        bytes32 dishId
    ) external view returns (uint256) {
        uint256 balance = _balances[dishId][user];
        uint256 rewardPerToken = rewardPerTokenStored[dishId];
        uint256 userPaid = userRewardPerTokenPaid[dishId][user];

        uint256 newRewards = (balance * (rewardPerToken - userPaid)) / REWARD_PRECISION;
        return pendingRewards[dishId][user] + newRewards;
    }

    /**
     * @notice Get user's token balance for a dish
     * @param user The user to query
     * @param dishId The dish to query
     * @return balance Token balance
     */
    function getBalance(address user, bytes32 dishId) external view returns (uint256) {
        return _balances[dishId][user];
    }

    /**
     * @notice Get dish information
     * @param dishId The dish to query
     * @return creator Address of dish creator
     * @return totalSupply Total tokens minted
     * @return createdAt Creation timestamp
     * @return metadata Metadata URI
     */
    function getDishInfo(
        bytes32 dishId
    )
        external
        view
        returns (
            address creator,
            uint256 totalSupply,
            uint256 createdAt,
            string memory metadata
        )
    {
        Dish storage dish = dishes[dishId];
        return (dish.creator, dish.totalSupply, dish.createdAt, dish.metadata);
    }

    /**
     * @notice Get the market cap of a dish (total value at current prices)
     * @param dishId The dish to query
     * @return marketCap Total market cap in USDC
     */
    function getMarketCap(bytes32 dishId) external view returns (uint256) {
        uint256 supply = dishes[dishId].totalSupply;
        if (supply == 0) return 0;

        // Market cap = sum of all token values at current price
        // Using arithmetic series: sum = n * (first + last) / 2
        // First token value = 1 * SLOPE, Last = supply * SLOPE
        return BondingCurve.getMintCost(0, supply);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update the protocol fee recipient
     * @param newRecipient New fee recipient address
     */
    function setProtocolFeeRecipient(address newRecipient) external onlyOwner {
        protocolFeeRecipient = newRecipient;
        emit ProtocolFeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Set the metadata URI for a dish (only creator or owner)
     * @param dishId The dish to update
     * @param newMetadata New metadata URI
     */
    function setDishMetadata(bytes32 dishId, string calldata newMetadata) external {
        Dish storage dish = dishes[dishId];
        if (!dish.exists) revert DishDoesNotExist();
        require(
            msg.sender == dish.creator || msg.sender == owner(),
            "Not authorized"
        );
        dish.metadata = newMetadata;
    }

    // ============ Internal Functions ============

    /**
     * @notice Update rewards for a user before balance changes
     * @param dishId The dish
     * @param user The user
     */
    function _updateRewards(bytes32 dishId, address user) internal {
        uint256 balance = _balances[dishId][user];
        uint256 rewardPerToken = rewardPerTokenStored[dishId];
        uint256 userPaid = userRewardPerTokenPaid[dishId][user];

        if (balance > 0) {
            uint256 newRewards = (balance * (rewardPerToken - userPaid)) / REWARD_PRECISION;
            pendingRewards[dishId][user] += newRewards;
        }

        userRewardPerTokenPaid[dishId][user] = rewardPerToken;
    }

    /**
     * @notice Update rewards specifically during minting (for new minters)
     * @dev New minters should not earn rewards from their own mint
     * @param dishId The dish
     * @param user The user minting
     */
    function _updateRewardsOnMint(bytes32 dishId, address user) internal {
        // If user already has balance, calculate their pending rewards first
        uint256 balance = _balances[dishId][user];
        uint256 rewardPerToken = rewardPerTokenStored[dishId];
        uint256 userPaid = userRewardPerTokenPaid[dishId][user];

        if (balance > 0) {
            uint256 newRewards = (balance * (rewardPerToken - userPaid)) / REWARD_PRECISION;
            pendingRewards[dishId][user] += newRewards;
        }

        // Set checkpoint to current (will be updated after mint adds to rewardPerTokenStored)
        // This is set before the supply increase, so new tokens won't earn from this mint
        userRewardPerTokenPaid[dishId][user] = rewardPerToken;
    }

    /**
     * @notice Override ERC1155 transfer to update reward tracking
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Update rewards before transfer
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 dishId = bytes32(ids[i]);

            if (from != address(0)) {
                _updateRewards(dishId, from);
                _balances[dishId][from] -= values[i];
            }

            if (to != address(0)) {
                _updateRewards(dishId, to);
                _balances[dishId][to] += values[i];
            }
        }

        super._update(from, to, ids, values);
    }

    /**
     * @notice Returns the URI for a token
     * @param tokenId The token ID (dishId as uint256)
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        bytes32 dishId = bytes32(tokenId);
        return dishes[dishId].metadata;
    }
}

