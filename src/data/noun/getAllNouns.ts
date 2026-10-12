"use server";
import { CHAIN_CONFIG } from "@/config";
import { Noun } from "./types";
import { revalidateTag, unstable_cache } from "next/cache";
import { IndexerNoun, transformQueryNounToNoun } from "./helpers";
import { indexerQueryAll } from "../indexer/client";

type SeedNode = {
  tokenId: string;
  background: string;
  body: string;
  accessory: string;
  head: string;
  glasses: string;
};

async function runPaginatedNounsQueryUncached(): Promise<IndexerNoun[]> {
  const [owners, seeds] = await Promise.all([
    indexerQueryAll<{ tokenId: string; owner: string }>(
      "allNouns",
      "tokenId owner",
    ),
    indexerQueryAll<SeedNode>(
      "allNounSeeds",
      "tokenId background body accessory head glasses",
    ),
  ]);
  if (!owners || !seeds) {
    throw new Error("getAllNouns: indexer query failed"); // Don't cache a failed read
  }

  const seedById = new Map(seeds.map((seed) => [seed.tokenId, seed]));
  return owners.flatMap(({ tokenId, owner }) => {
    const seed = seedById.get(tokenId);
    return seed ? [{ id: tokenId, owner, seed }] : [];
  });
}

const runPaginatedNounsQuery = unstable_cache(
  runPaginatedNounsQueryUncached,
  ["run-paginated-nouns-query", CHAIN_CONFIG.chain.id.toString()],
  {
    revalidate: 5 * 60, // 5min
    tags: [`paginated-nouns-query-${CHAIN_CONFIG.chain.id.toString()}`],
  },
);

export async function getAllNounsUncached(): Promise<Noun[]> {
  const queryResponse = await runPaginatedNounsQueryUncached().catch((e) => {
    console.error(e);
    return [];
  });
  const nouns = queryResponse.map(transformQueryNounToNoun);

  // Sort by id, descending
  nouns.sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));

  return nouns;
}

export async function getAllNouns(): Promise<Noun[]> {
  const queryResponse = await runPaginatedNounsQuery().catch((e) => {
    console.error(e);
    return [];
  });
  const nouns = queryResponse.map(transformQueryNounToNoun);

  // Sort by id, descending
  nouns.sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));

  return nouns;
}

export async function forceAllNounRevalidation() {
  revalidateTag(`paginated-nouns-query-${CHAIN_CONFIG.chain.id.toString()}`);
}

export async function checkForAllNounRevalidation(nounId: string) {
  const allNouns = await getAllNouns();
  if (allNouns[0]?.id && BigInt(allNouns[0].id) < BigInt(nounId)) {
    forceAllNounRevalidation();
  }
}
