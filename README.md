# Nouns.com

Bid, explore, buy, and swap to find your forever Noun.

## Structure

- [Web](./web): The web app
- [Indexer](./indexer): Onchain data indexer that powers the web app
- [Indexer](./cms): Content management system consumed by the web app

> See the individual folders for more details

## Development

```bash
docker compose up --build
```

# Nouns.com Web App

Bid, explore, buy, and swap to find your forever Noun.

## Deployments

- Mainnet: [nouns.com](https://www.nouns.com)
- Sepolia: [sepolia.nouns.com](https://www.sepolia.nouns.com)

## Local Development

Copy `.env.example` to `.env`

```bash
cp .env.example .env
```

Populate the `.env` file

Install dependencies

```bash
pnpm install
```

Start dev server

```bash
pnpm dev
```

Build for production

```bash
pnpm build
```
