// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BondingCurve
 * @notice Library for linear bonding curve price calculations
 * @dev Price = BASE_PRICE + (supply * SLOPE) (linear curve starting at $0.1)
 *      Uses USDC with 6 decimals
 */
library BondingCurve {
    uint256 public constant BASE_PRICE = 1_000_000;
    uint256 public constant SLOPE = 12500;
    uint256 public constant REFUND_RATE = 70;
    uint256 public constant REFERRAL_FEE_BPS = 250;
    uint256 public constant REWARD_FEE_BPS = 250;
    uint256 public constant TOTAL_FEE_BPS = 500;

    /**
     * @notice Calculate the current price for the next token
     * @param currentSupply Current total supply of the dish token
     * @return price Price in USDC (6 decimals) for the next token
     */
    /**
     * @notice Calculate the current price for the next token
     * @param currentSupply Current total supply of the dish token
     * @return price Price in USDC (6 decimals) for the next token
     */
    function getCurrentPrice(uint256 currentSupply) internal pure returns (uint256) {
        return BASE_PRICE + (currentSupply * SLOPE);
    }

    /**
     * @notice Calculate total cost to mint a specific number of tokens
     * @dev Uses arithmetic series sum: n/2 * (first + last)
     *      Cost = sum of prices from currentSupply to (currentSupply + amount - 1)
     * @param currentSupply Current total supply
     * @param amount Number of tokens to mint
     * @return cost Total cost in USDC (6 decimals)
     */
    function getMintCost(uint256 currentSupply, uint256 amount) internal pure returns (uint256) {
        if (amount == 0) return 0;

        uint256 firstPrice = BASE_PRICE + (currentSupply * SLOPE);
        uint256 lastPrice = BASE_PRICE + ((currentSupply + amount - 1) * SLOPE);

        return (amount * (firstPrice + lastPrice)) / 2;
    }

    /**
     * @notice Calculate how many tokens can be minted with a given USDC amount
     * @dev Solves quadratic equation to find token amount
     * @param currentSupply Current total supply
     * @param usdcAmount Amount of USDC to spend
     * @return tokens Number of whole tokens that can be minted
     * @return actualCost Actual USDC cost for those tokens
     */
    function getTokensForUsdc(
        uint256 currentSupply,
        uint256 usdcAmount
    ) internal pure returns (uint256 tokens, uint256 actualCost) {
        if (usdcAmount == 0) return (0, 0);

        uint256 b = 2 * BASE_PRICE + 2 * currentSupply * SLOPE - SLOPE;
        uint256 discriminant = b * b + 8 * SLOPE * usdcAmount;
        uint256 sqrtDisc = sqrt(discriminant);

        if (sqrtDisc <= b) return (0, 0);

        tokens = (sqrtDisc - b) / (2 * SLOPE);

        if (tokens == 0) return (0, 0);

        actualCost = getMintCost(currentSupply, tokens);

        return (tokens, actualCost);
    }

    /**
     * @notice Calculate the sell value for a number of tokens
     * @dev Returns 70% of the current market value
     * @param currentSupply Current total supply (before selling)
     * @param amount Number of tokens to sell
     * @return value Refund amount in USDC (6 decimals)
     */
    function getSellValue(uint256 currentSupply, uint256 amount) internal pure returns (uint256) {
        if (amount == 0 || amount > currentSupply) return 0;

        uint256 lastPrice = BASE_PRICE + ((currentSupply - 1) * SLOPE);
        uint256 firstPrice = BASE_PRICE + ((currentSupply - amount) * SLOPE);
        uint256 totalValue = (amount * (firstPrice + lastPrice)) / 2;

        return (totalValue * REFUND_RATE) / 100;
    }

    /**
     * @notice Calculate fee amounts from a mint cost
     * @param totalCost Total mint cost in USDC
     * @return referralFee Amount for referrer (2.5%)
     * @return rewardFee Amount for reward pool (2.5%)
     * @return netAmount Amount going to vault (95%)
     */
    function calculateFees(
        uint256 totalCost
    ) internal pure returns (uint256 referralFee, uint256 rewardFee, uint256 netAmount) {
        referralFee = (totalCost * REFERRAL_FEE_BPS) / 10000;
        rewardFee = (totalCost * REWARD_FEE_BPS) / 10000;
        netAmount = totalCost - referralFee - rewardFee;
    }

    /**
     * @notice Integer square root using Newton's method
     * @param x The number to find the square root of
     * @return y The integer square root
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;
        y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

