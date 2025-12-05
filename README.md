# tmap

**Turn your taste into treasure.**

tmap is a social map of food culture where users discover dishes, mint them as onchain stamps, and earn rewards as trends grow. Built as a Farcaster Mini-App on Base.

## Live App

- **Mini-App**: Open in Farcaster. [mbc-tau.vercel.app](https://mbc-tau.vercel.app)
- **Contract**: [0xDF8F506c5D8a69bC8f86D427a0bf6e65B2491a68](https://sepolia.basescan.org/address/0xDF8F506c5D8a69bC8f86D427a0bf6e65B2491a68) (Base Sepolia)

## How It Works

1. **Discover** - Find dishes on the map or explore trending dishes and mint tokens
2. **Mint** - Pay USDC to mint a dish stamp (must be within 200m of the restaurant/geo-restricted)
3. **Earn** - As more people mint, your stamp value increases via linesr one way bonding curve (users capped at $10)

Note: Require Base USDC on the testnet. Use the "Get $5" Faucet in case you dont have the USDC in the Base Testnet.

## Features

- **Bonding Curve Pricing**: Price = `1 + (supply × 0.125)` USDC
- **$10 Max Spend**: Per user, per dish
- **70% Sell Value**: Sell anytime and get 70% of current market value
- **2.5% Referral Rewards**: Share dishes and earn 2.5% referrak reward on every mint (check the rewards page!)
- **2.5% Holder Rewards**: Existing holders earn when others mint (check the holdings fee in the rewards page!)
- **Geo-Verification**: Must be at the restaurant to create a dish (within 200m)
- **Farcaster Integration**: Native social sharing and wallet connection and earn token referral fee.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Blockchain | Base Sepolia, Solidity, Hardhat |
| Token | ERC1155 (OpenZeppelin) |
| Database | MongoDB Atlas |
| Auth | Farcaster Mini-App SDK |
| Wallet | wagmi v2, viem, Farcaster Wallet Connector |
| Paymaster | Coinbase Paymaster|
| Maps | Google Maps API |

## Architecture

### Gasless Transactions
All transactions are gasless for users via **Coinbase Paymaster** integrated through Farcaster's wallet infrastructure. We use wagmi's `useSendCalls` hook with the `farcasterMiniApp` connector which automatically routes transactions through Farcaster's sponsored transaction flow.

### Bonding Curve Math
Linear bonding curve with arithmetic series pricing:
- **Base Price**: $1 USDC
- **Slope**: $0.125 per token
- **Price Formula**: `Price(n) = 0.1 + (n × 0.0125)` where n = current supply
- **Mint Cost**: Uses arithmetic series sum `Cost = n/2 × (firstPrice + lastPrice)`
- **Sell Value**: 70% of current market value (one-way curve)

### Fee Distribution (5% total on mint)
| Fee | Recipient | Purpose |
|-----|-----------|---------|
| 2.5% | Referrer | Incentivize sharing |
| 2.5% | Holder Pool | Time-weighted rewards for existing holders |

### Reward Calculation
Holder rewards use a time-weighted distribution model:
- `rewardPerToken = rewardPerTokenStored + (rewardFee × 1e18 / totalSupply)`
- `earned = balance × (rewardPerToken - userRewardPerTokenPaid)`

## Smart Contract

**TmapDishes.sol** - ERC1155 token with bonding curve mechanics

```
Contract: 0xDF8F506c5D8a69bC8f86D427a0bf6e65B2491a68
Network: Base Sepolia (Chain ID: 84532)
USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Contract Functions

| Function | Description |
|----------|-------------|
| `createDish(bytes32, string)` | Create new dish with metadata |
| `mint(bytes32, uint256, address)` | Mint tokens with USDC, optional referrer |
| `sell(bytes32, uint256)` | Sell tokens back for 70% value |
| `claimRewards(bytes32)` | Claim holder rewards for a dish |
| `claimReferralRewards()` | Claim accumulated referral earnings |
| `getCurrentPrice(bytes32)` | Get current token price |
| `getTokensForUsdc(bytes32, uint256)` | Calculate tokens for USDC amount |
| `getSellValue(bytes32, uint256)` | Get sell value for tokens |

### Security
- OpenZeppelin `ReentrancyGuard` on all state-changing functions
- `Ownable` for admin functions
- $10 max spend per user per dish (prevents whale manipulation)
- USDC approval required before minting

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your MONGODB_URI, GOOGLE_MAPS_API_KEY, etc.

# Run development server
npm run dev
```

### Smart Contracts

```bash
cd contracts
npm install

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy
npx hardhat run scripts/deploy.ts --network baseSepolia
```

## Environment Variables

```
MONGODB_URI=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_TMAP_DISHES_CONTRACT_ADDRESS=
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=
NEXT_PUBLIC_APP_URL=
FAUCET_PRIVATE_KEY=
```

## Project Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── dish/[id]/        # Dish detail page
│   ├── create/           # Create dish flow
│   ├── profile/          # User profile
│   ├── rewards/          # Rewards dashboard
│   └── providers/        # Farcaster & Wagmi providers
├── contracts/             # Solidity smart contracts
│   └── contracts/
│       ├── TmapDishes.sol
│       └── libraries/BondingCurve.sol
├── lib/                   # Utilities
│   ├── contracts.ts      # ABIs and addresses
│   ├── mongodb.ts        # Database connection
│   └── geo.ts            # Location utilities
└── public/               # Static assets
    └── .well-known/      # Farcaster manifest
```

## Links

- [Base Sepolia Explorer](https://sepolia.basescan.org/address/0xDF8F506c5D8a69bC8f86D427a0bf6e65B2491a68)
- [Farcaster Mini-Apps Docs](https://miniapps.farcaster.xyz)
