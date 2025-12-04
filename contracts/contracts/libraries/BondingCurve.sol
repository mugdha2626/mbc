// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BondingCurve
 * @notice Library for linear bonding curve price calculations
 * @dev Price = supply * SLOPE (linear curve starting at 0)
 *      Uses USDC with 6 decimals
 */
library BondingCurve {
    // 0.0125 USDC per token in the supply (6 decimals)
    uint256 public constant SLOPE = 12500; // 0.0125 * 1e6

    // 70% refund rate when selling back
    uint256 public constant REFUND_RATE = 70;

    // Fee percentages (in basis points, 100 = 1%)
    uint256 public constant REFERRAL_FEE_BPS = 250; // 2.5%
    uint256 public constant REWARD_FEE_BPS = 250; // 2.5%
    uint256 public constant TOTAL_FEE_BPS = 500; // 5%

    /**
     * @notice Calculate the current price for the next token
     * @param currentSupply Current total supply of the dish token
     * @return price Price in USDC (6 decimals) for the next token
     */
    function getCurrentPrice(uint256 currentSupply) internal pure returns (uint256) {
        // Price = (currentSupply + 1) * SLOPE
        // Adding 1 because we're pricing the next token to be minted
        return (currentSupply + 1) * SLOPE;
    }

    /**
     * @notice Calculate total cost to mint a specific number of tokens
     * @dev Uses arithmetic series sum: n/2 * (first + last)
     *      Cost = sum of prices from (currentSupply + 1) to (currentSupply + amount)
     * @param currentSupply Current total supply
     * @param amount Number of tokens to mint
     * @return cost Total cost in USDC (6 decimals)
     */
    function getMintCost(uint256 currentSupply, uint256 amount) internal pure returns (uint256) {
        if (amount == 0) return 0;

        // First token price: (currentSupply + 1) * SLOPE
        // Last token price: (currentSupply + amount) * SLOPE
        // Sum = amount * SLOPE * (2 * currentSupply + amount + 1) / 2

        uint256 firstPrice = (currentSupply + 1) * SLOPE;
        uint256 lastPrice = (currentSupply + amount) * SLOPE;

        // Arithmetic series sum: n * (first + last) / 2
        return (amount * (firstPrice + lastPrice)) / 2;
    }

    /**
     * @notice Calculate how many tokens can be minted with a given USDC amount
     * @dev Solves quadratic: amount * SLOPE * (2S + amount + 1) / 2 = usdcAmount
     *      Rearranged: SLOPE * amount^2 + SLOPE * (2S + 1) * amount - 2 * usdcAmount = 0
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

        // Quadratic formula: ax^2 + bx + c = 0
        // a = SLOPE
        // b = SLOPE * (2 * currentSupply + 1)
        // c = -2 * usdcAmount

        // x = (-b + sqrt(b^2 + 4ac)) / 2a
        // Since c is negative: x = (-b + sqrt(b^2 + 8 * SLOPE * usdcAmount)) / (2 * SLOPE)

        uint256 b = SLOPE * (2 * currentSupply + 1);
        uint256 discriminant = b * b + 8 * SLOPE * usdcAmount;

        // Calculate square root using Newton's method
        uint256 sqrtDisc = sqrt(discriminant);

        // tokens = (sqrtDisc - b) / (2 * SLOPE)
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

        // Value of tokens being sold at current prices
        // Last token price: currentSupply * SLOPE
        // First token being sold: (currentSupply - amount + 1) * SLOPE

        uint256 lastPrice = currentSupply * SLOPE;
        uint256 firstPrice = (currentSupply - amount + 1) * SLOPE;

        // Sum of arithmetic series
        uint256 totalValue = (amount * (firstPrice + lastPrice)) / 2;

        // Apply 70% refund rate
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

