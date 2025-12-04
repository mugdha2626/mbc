# tmap Smart Contracts

Smart contracts for tmap - The First Social Map of Food Culture You Can Own.

Deployed contract address: 0xF8769B70D392C306018C5474933D59846feb217A

## Overview

The `TmapDishes` contract is an ERC1155 token that represents dish badges at restaurants. Each dish has its own bonding curve, allowing users to mint and trade dish tokens.

### Key Features

- **Linear Bonding Curve**: Price = supply × 0.0125 USDC
- **$10 Max Spend**: Users can spend up to $10 USDC per dish
- **70% Refund Rate**: Sell tokens back at 70% of current value
- **2.5% Referral Fee**: Referrers earn 2.5% of mint cost
- **2.5% Holder Rewards**: Existing holders earn 2.5% of new mints

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```bash
# Deployer private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
# Single API key works for all chains via Etherscan API V2
# Get your key at: https://etherscan.io/myapikey
ETHERSCAN_API_KEY=your_etherscan_api_key

# Enable gas reporting in tests
REPORT_GAS=false
```

## Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Deploy to Base Sepolia
npm run deploy:sepolia

# Deploy to Base Mainnet
npm run deploy:mainnet
```

## Contract Architecture

### TmapDishes.sol

Main ERC1155 contract managing all dish tokens.

**Core Functions:**

| Function | Description |
|----------|-------------|
| `createDish(dishId, metadata)` | Register a new dish |
| `mint(dishId, usdcAmount, referrer)` | Mint tokens (up to $10) |
| `sell(dishId, tokenAmount)` | Sell tokens at 70% value |
| `claimRewards(dishId)` | Claim holder rewards |

**View Functions:**

| Function | Description |
|----------|-------------|
| `getCurrentPrice(dishId)` | Current price for next token |
| `getMintCost(dishId, amount)` | Cost to mint N tokens |
| `getSellValue(dishId, amount)` | Refund for selling N tokens |
| `calculatePendingRewards(user, dishId)` | Pending rewards |

### BondingCurve.sol

Library for price calculations.

- Linear curve: `Price = (supply + 1) × 0.0125 USDC`
- Uses arithmetic series for bulk operations
- 70% refund rate on sells

## Reward System

The reward system uses the "reward per token" pattern (similar to Synthetix staking):

1. When someone mints, 2.5% goes to the reward pool
2. This fee is divided by current supply to get "reward per token"
3. Existing holders earn proportionally to their balance
4. Claiming rewards only affects the claimer, not other holders

**Example:**
- User A mints as 5th holder
- 15 more people mint after
- User A earns 2.5% of each subsequent mint, proportional to their share

## Network Configuration

| Network | Chain ID | USDC Address |
|---------|----------|--------------|
| Base Mainnet | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | 84532 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

## Security Considerations

- Reentrancy protection on all state-changing functions
- $10 cap prevents whale manipulation
- One-way bonding curve (price never decreases)
- Reward calculations use high precision to prevent rounding attacks
