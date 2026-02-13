"use server";
import { CHAIN_CONFIG } from "@/config";
import { Noun, SecondaryNounListing } from "./types";
import { revalidateTag, unstable_cache } from "next/cache";
import { transformOnChainNounToNoun } from "./helpers";
import { getSecondaryNounListings } from "./getSecondaryNounListings";
import { nounsTokenAbi } from "@/abis/nounsToken";
import { readContract, multicall } from "viem/actions";
import { getAddress } from "viem";
import { parseSeedTuple } from "./seedUtils";

const MULTICALL_BATCH_SIZE = 200;

async function fetchAllNounsOnChainUncached(): Promise<
  Omit<Noun, "secondaryListing">[]
> {
  const totalSupply = await readContract(CHAIN_CONFIG.publicClient, {
    address: CHAIN_CONFIG.addresses.nounsToken,
    abi: nounsTokenAbi,
    functionName: "totalSupply",
  });

  const total = Number(totalSupply);
  const nouns: Omit<Noun, "secondaryListing">[] = [];

  for (let i = 0; i < total; i += MULTICALL_BATCH_SIZE) {
    const batchSize = Math.min(MULTICALL_BATCH_SIZE, total - i);
    const contracts = [];

    for (let j = 0; j < batchSize; j++) {
      const tokenId = BigInt(i + j);
      contracts.push({
        address: CHAIN_CONFIG.addresses.nounsToken,
        abi: nounsTokenAbi,
        functionName: "ownerOf" as const,
        args: [tokenId] as const,
      });
      contracts.push({
        address: CHAIN_CONFIG.addresses.nounsToken,
        abi: nounsTokenAbi,
        functionName: "seeds" as const,
        args: [tokenId] as const,
      });
    }

    const results = await multicall(CHAIN_CONFIG.publicClient, {
      contracts,
      allowFailure: true,
    });

    for (let j = 0; j < batchSize; j++) {
      const ownerResult = results[j * 2];
      const seedResult = results[j * 2 + 1];

      if (
        ownerResult.status !== "success" ||
        seedResult.status !== "success"
      ) {
        continue;
      }

      const owner = ownerResult.result as string;
      const seed = seedResult.result as readonly [
        number,
        number,
        number,
        number,
        number,
      ];

      nouns.push(
        transformOnChainNounToNoun(
          (i + j).toString(),
          getAddress(owner),
          parseSeedTuple(seed),
        ),
      );
    }
  }

  return nouns;
}

const fetchAllNounsOnChain = unstable_cache(
  fetchAllNounsOnChainUncached,
  ["fetch-all-nouns-onchain", CHAIN_CONFIG.chain.id.toString()],
  {
    revalidate: 5 * 60, // 5min
    tags: [`paginated-nouns-query-${CHAIN_CONFIG.chain.id.toString()}`],
  },
);

function sortDescendingById(nouns: Omit<Noun, "secondaryListing">[]): Omit<Noun, "secondaryListing">[] {
  return [...nouns].sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));
}

function mergeWithListings(
  nouns: Omit<Noun, "secondaryListing">[],
  listings: SecondaryNounListing[],
): Noun[] {
  return nouns.map((noun) => ({
    ...noun,
    secondaryListing: listings.find((listing) => listing.nounId === noun.id) ?? null,
  }));
}

export async function getAllNounsUncached(): Promise<Noun[]> {
  const [onChainNouns, secondaryNounListings] = await Promise.all([
    fetchAllNounsOnChainUncached(),
    getSecondaryNounListings(),
  ]);

  return mergeWithListings(sortDescendingById(onChainNouns), secondaryNounListings);
}

export async function getAllNouns(): Promise<Noun[]> {
  const [onChainNouns, secondaryNounListings] = await Promise.all([
    fetchAllNounsOnChain(),
    getSecondaryNounListings(),
  ]);

  return mergeWithListings(sortDescendingById(onChainNouns), secondaryNounListings);
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
