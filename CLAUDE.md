# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tmap is a social map of food culture where users can mint dishes as onchain tokens. When users visit a restaurant, they can mint a dish as an ERC1155 badge. Each dish has a bonding curve pricing mechanism - price increases as more people mint. Users can spend up to $10 per dish, and early adopters earn micro-rewards as the trend grows.

The app integrates with Farcaster as a mini-app, using the Farcaster SDK for authentication and wallet connection.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run seed         # Seed database: npx tsx scripts/seed.ts

# Smart Contracts (from /contracts directory)
cd contracts
npx hardhat compile                           # Compile contracts
npx hardhat test                              # Run contract tests
npx hardhat run scripts/deploy.ts --network baseSepolia  # Deploy to Base Sepolia
npx hardhat run scripts/verify.ts --network baseSepolia  # Verify on Etherscan
```

## Architecture

### Frontend (Next.js 16 App Router)

- **Providers** (`app/providers/`): Wrap the app with Farcaster SDK and Wagmi for wallet/auth
  - `FarcasterProvider.tsx`: Handles Farcaster mini-app SDK, user auth, syncs user to DB on login
  - `WagmiProvider.tsx`: Configures wagmi with Base Sepolia and Farcaster wallet connector

- **Pages**:
  - `/` - Map-based discovery page with search (restaurants, dishes, users)
  - `/explore` - Browse trending dishes
  - `/create` - Geo-restricted dish creation (must be at restaurant)
  - `/dish/[id]` - Dish detail with minting UI
  - `/restaurant/[id]` - Restaurant detail with dish list
  - `/portfolio` - User's owned dish tokens
  - `/profile/[fid]` - User profile by Farcaster ID

- **Components** (`app/components/`): Organized by type (cards/, layout/, map/, ui/, shared/)

### Backend (Next.js API Routes)

- **Database**: MongoDB (collection "tmap")
  - Collections: `users`, `dishes`, `restaurants`
  - Connection: `lib/mongodb.ts` with connection pooling

- **API Routes**:
  - `/api/auth/sync` - Upsert user on Farcaster login
  - `/api/dish/create` - Create/save dish to DB after contract interaction
  - `/api/restaurants` - Get restaurants for map
  - `/api/search` - Search dishes, restaurants, users
  - `/api/users/[fid]` - Get user by Farcaster ID

### Smart Contracts (Solidity, `/contracts`)

- **TmapDishes.sol**: ERC1155 token for dish badges
  - Linear bonding curve: `Price = supply * 0.0125 USDC`
  - $10 max spend per user per dish
  - 70% refund rate on sells
  - 2.5% referral fee + 2.5% holder rewards on each mint
  - Uses OpenZeppelin ERC1155, Ownable, ReentrancyGuard

- **Deployment**: Base Sepolia (chainId 84532) or Base Mainnet (8453)

### Key Libraries

- `lib/contracts.ts`: Contract addresses, ABIs for TmapDishes and USDC
- `lib/geo.ts`: Haversine distance calculation, geo-restriction helpers (200m default)
- `lib/db/users.ts`: User CRUD operations

### Type Definitions

Core types defined in `app/interface.tsx`:
- `User`: fid, username, badges, walletAddress, portfolio, reputationScore, wishList
- `Portfolio`: totalValue, totalReturn, dishes array with quantity/return/referrals
- `Restaurant`: id, coordinates, name, address, dishes, tmapRating
- `Dish`: dishId, prices, supply, holders, volume, marketCap, creator, restaurant

### Environment Variables

Required in `.env.local`:
- `MONGODB_URI` - MongoDB connection string
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `NEXT_PUBLIC_TMAP_DISHES_CONTRACT_ADDRESS` - Deployed TmapDishes contract
- `NEXT_PUBLIC_USDC_CONTRACT_ADDRESS` - USDC token address

For contracts:
- `PRIVATE_KEY` - Deployer wallet private key
- `ETHERSCAN_API_KEY` - For contract verification
