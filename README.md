# Nouns.com Web App

Bid, explore, buy, and swap to find your forever Noun.

## Deployments

- Mainnet: [nouns.com](https://www.nouns.com)

## Local Development

Copy `.env.example` to `.env` and populate it:

```bash
cp .env.example .env
```

Install dependencies:

```bash
pnpm install
```

Start dev server:

```bash
pnpm dev
```

Build for production (runs codegen automatically):

```bash
pnpm build
```

Run codegen manually (GraphQL types + Wagmi):

```bash
pnpm codegen
```
