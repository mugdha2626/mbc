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

- **Bonding Curve Pricing**: Price = `0.1 + (supply × 0.0125)` USDC
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
| Blockchain | Base Sepolia, Solidity, Hardhat, Farcaster |
| Database | MongoDB |
| Auth | Farcaster Mini-App SDK |
| Wallet | wagmi, viem |
| Maps | Google Maps API |

## Smart Contract

**TmapDishes.sol** - ERC1155 token with bonding curve mechanics

```
Contract: 0xDF8F506c5D8a69bC8f86D427a0bf6e65B2491a68
Network: Base Sepolia (Chain ID: 84532)
USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

Key functions:
- `createDish(bytes32 dishId, string metadata)` - Create a new dish
- `mint(bytes32 dishId, uint256 usdcAmount, address referrer)` - Mint stamps
- `sell(bytes32 dishId, uint256 tokenAmount)` - Sell stamps for USDC
- `claimRewards(bytes32 dishId)` - Claim holder rewards
- `claimReferralRewards()` - Claim referral earnings

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
