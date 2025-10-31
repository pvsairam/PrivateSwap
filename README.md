# PrivateSwap - Privacy-First DEX

A decentralized exchange (DEX) built with privacy-first principles, leveraging Zama's Fully Homomorphic Encryption (FHEVM) technology on the Sepolia testnet.

![License](https://img.shields.io/badge/License-MIT-green) ![Status](https://img.shields.io/badge/Status-Live%20on%20Sepolia-success)

## Features

- **Privacy-Preserving Swaps**: Leverage FHEVM for encrypted token swaps
- **Live Price Integration**: Real-time ETH/USDT prices from CoinGecko  
- **Market-Accurate Pools**: Liquidity pools balanced to match live market rates
- **Dual Token System**: 
  - Public tokens (PUSD, PETH) for transparent swaps
  - Encrypted tokens (ePUSD, ePETH) for private swaps
- **Wallet Integration**: Seamless connection with RainbowKit
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Live Demo

**Contract Addresses (Sepolia):**
- PUSD Token: `0x152a668B68EbFf2d1d2305bDA0D44dDEE41f8Ac6`
- PETH Token: `0x39A6651112ED9D7cDAD7bc6701f0D6A67c147181`
- DemoSwap AMM: `0xB13707a8afb851d4Bf976956A6298D800d334F85`

Pool: 100,000 PUSD + 26 PETH (1 PETH ≈ 3,846 PUSD, matched to live market)

[View on Etherscan](https://sepolia.etherscan.io/address/0xB13707a8afb851d4Bf976956A6298D800d334F85)

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS + Shadcn/ui components
- Wagmi v2 + RainbowKit for Web3
- TanStack Query for state management
- Three.js for animated backgrounds

### Backend
- Express.js + TypeScript
- PostgreSQL with Drizzle ORM
- Viem for Ethereum interactions

### Smart Contracts
- Solidity with Hardhat
- Zama FHEVM (fhevm@0.6.2, fhevm-contracts@0.2.1)
- Deployed on Sepolia testnet

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Sepolia testnet ETH
- MetaMask or compatible wallet

### Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Session
SESSION_SECRET=your-random-secret-string

# Sepolia (for contract deployment and faucet)
SEPOLIA_PRIVATE_KEY=your-private-key-without-0x-prefix
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

### Building for Production

```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import repository in Vercel
3. Add environment variables (DATABASE_URL, SESSION_SECRET, SEPOLIA_PRIVATE_KEY)
4. Deploy!

Configuration is already set in `vercel.json`.

### Deploy Contracts

```bash
# Compile contracts
cd contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy-new.cjs --network sepolia

# Update contract addresses in client/src/lib/contracts.ts
```

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── public/
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   └── storage.ts       # Database layer
├── contracts/           # Solidity contracts
│   ├── src/             # Contract source
│   └── scripts/         # Deployment scripts
└── shared/              # Shared types
```

## How It Works

### DemoSwap (Public AMM)
- Constant product market maker (x × y = k)
- 0.3% swap fee
- Pool automatically balanced to live market prices
- Real-time reserve tracking via blockchain

### PrivateSwap (FHEVM AMM)
- Encrypted reserves using euint64
- Private swap amounts computed using TFHE operations
- MEV protection - transaction amounts invisible to miners
- Front-running resistant - encrypted inputs prevent sandwich attacks

### Faucet System
- Distributes PUSD and PETH tokens on Sepolia
- 24-hour cooldown per wallet address
- Admin panel with signature verification for configuration

### Live Price Integration
- Fetches ETH/USDT prices from CoinGecko API
- Updates every 60 seconds
- Used for USD value display only
- Swap quotes based on actual pool reserves

## API Endpoints

- `GET /api/prices` - Get live ETH/USDT prices
- `GET /api/faucet/settings` - Get faucet configuration
- `POST /api/faucet/claim` - Claim test tokens (with cooldown)
- `POST /api/faucet/settings` - Update faucet settings (admin only)

## Development

### Running Tests

```bash
# Run contract tests
cd contracts
npx hardhat test

# Run local Hardhat node
npx hardhat node
```

### Local Development with fhEVM

```bash
# Start local fhEVM node (for encrypted operations)
npx fhevm:start

# Deploy PrivateSwap to local network
npx hardhat run scripts/deploy-private.ts --network localhost
```

## Security

⚠️ **This is a testnet demo. Do not use in production without proper security audits.**

- Smart contracts are unaudited
- Use testnet tokens only
- Private keys are for development/testing only

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Acknowledgments

Built for Zama's FHEVM developer program using:
- Zama FHEVM packages (fhevm@0.6.2)
- Simple TFHE approach (same as September 2025 bounty winners)
- No gateway or coprocessor required
