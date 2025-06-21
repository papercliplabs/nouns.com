# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (includes codegen)
- `pnpm lint` - Lint the codebase
- `pnpm codegen` - Run GraphQL codegen and Wagmi generation
- `pnpm codegen-watch` - Watch for changes and regenerate types

Always run `pnpm codegen` before building to ensure generated types are up to date.

## Project Architecture

This is a Next.js 14 web application for Nouns.com, a platform for bidding, exploring, buying, and swapping Nouns NFTs.

### Key Architecture Components

**Multi-Chain Configuration**: The app supports mainnet and Sepolia testnet with chain-specific configurations in `src/config.ts`, including smart contract addresses, RPC endpoints, and subgraph URLs.

**Data Layer**:
- GraphQL with generated types from multiple sources (CMS, indexer, Ponder)
- Custom indexer at `src/data/ponder/` for onchain data aggregation
- TanStack Query for client-side caching and data management
- Reservoir SDK integration for NFT marketplace data

**Smart Contract Integration**:
- Wagmi + Viem for Ethereum interactions
- Custom hooks in `src/hooks/transactions/` for transaction management
- ABIs stored in `src/abis/` for contract interactions
- Contract addresses configured per chain in `src/config.ts`

**UI Framework**:
- Radix UI primitives with custom styling
- Tailwind CSS with custom theme configuration
- Framer Motion for animations
- Responsive design with mobile-first approach

### Key Directories

- `src/app/` - Next.js App Router with nested layouts and route groups
- `src/components/` - Reusable UI components organized by feature
- `src/data/` - Data fetching logic and GraphQL operations
- `src/hooks/` - Custom React hooks, especially for transactions
- `src/providers/` - Context providers for app-wide state
- `src/utils/` - Utility functions and helpers

### Important Notes

**Environment Setup**: Copy `.env.example` to `.env` and populate required API keys for Alchemy, Infura, and other services.

**Code Generation**: The codebase relies heavily on generated types from GraphQL schemas and Wagmi. Always run codegen after schema changes.

**Transaction Management**: Use the custom transaction hooks in `src/hooks/transactions/` which include proper error handling, loading states, and transaction tracking.

**Chain Configuration**: When adding new contracts or chains, update `src/config.ts` with the appropriate addresses and configuration.

**Image Handling**: The app uses extensive image optimization for Noun NFTs. Noun image generation logic is in `src/utils/nounImages/`.
