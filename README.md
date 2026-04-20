>  Nouns.com is now read-only and this repository is archived and not activly maintained.
> 
>  For now, the site remains live as an informational interface into Nouns DAO, but all onchain actions (bidding, voting, swapping, converting to/from $NOUNS) have been removed.
>
>  Previous functionality — instant swap, treasury swap proposals, the $NOUNS ERC-20 convert flow, DAO voting, etc, can explored in the git history prior to the read-only conversion.


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
