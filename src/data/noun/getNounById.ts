"use server";
import { getAddress } from "viem";
import { readContract } from "viem/actions";
import { unstable_cache } from "next/cache";
import { nounsTokenAbi } from "@/abis/nounsToken";
import { CHAIN_CONFIG } from "@/config";
import { SECONDS_PER_HOUR } from "@/utils/constants";
import { checkForAllNounRevalidation } from "./getAllNouns";
import { getSecondaryListingForNoun } from "./getSecondaryNounListings";
import { transformOnChainNounToNoun } from "./helpers";
import { parseSeedTuple } from "./seedUtils";
import { Noun } from "./types";

async function fetchNounOnChain(
  id: string,
): Promise<Omit<Noun, "secondaryListing"> | undefined> {
  try {
    const [owner, seed] = await Promise.all([
      readContract(CHAIN_CONFIG.publicClient, {
        address: CHAIN_CONFIG.addresses.nounsToken,
        abi: nounsTokenAbi,
        functionName: "ownerOf",
        args: [BigInt(id)],
      }),
      readContract(CHAIN_CONFIG.publicClient, {
        address: CHAIN_CONFIG.addresses.nounsToken,
        abi: nounsTokenAbi,
        functionName: "seeds",
        args: [BigInt(id)],
      }),
    ]);

    return transformOnChainNounToNoun(
      id,
      getAddress(owner),
      parseSeedTuple(seed),
    );
  } catch (e) {
    console.error("fetchNounOnChain - failed for id", id, e);
    return undefined;
  }
}

// On-chain data (owner + seed) is cached for 1 hour. Seeds are immutable,
// owner changes infrequently. Secondary listings are always fetched fresh.
const fetchNounOnChainCached = unstable_cache(
  fetchNounOnChain,
  ["get-noun-by-id"],
  { revalidate: SECONDS_PER_HOUR },
);

async function withSecondaryListing(
  id: string,
  onChainFetch: (id: string) => Promise<Omit<Noun, "secondaryListing"> | undefined>,
): Promise<Noun | undefined> {
  const [noun, secondaryListing] = await Promise.all([
    onChainFetch(id),
    getSecondaryListingForNoun(id),
  ]);

  if (!noun) return undefined;

  checkForAllNounRevalidation(id);
  return { ...noun, secondaryListing };
}

export async function getNounByIdUncached(
  id: string,
): Promise<Noun | undefined> {
  return withSecondaryListing(id, fetchNounOnChain);
}

export async function getNounById(
  id: string,
): Promise<Noun | undefined> {
  return withSecondaryListing(id, fetchNounOnChainCached);
}
