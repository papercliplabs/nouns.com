"use server";
import { Noun } from "./types";
import { checkForAllNounRevalidation } from "./getAllNouns";
import { CHAIN_CONFIG } from "@/config";
import { IndexerNoun, transformQueryNounToNoun } from "./helpers";
import { unstable_cache } from "next/cache";
import { SECONDS_PER_HOUR } from "@/utils/constants";
import { indexerQuery } from "../indexer/client";
import { multicall } from "viem/actions";
import { nounsNftTokenConfig } from "../generated/wagmi";

const query = /* GraphQL */ `
  query NounById($id: BigFloat!) {
    allNouns(condition: { tokenId: $id }) {
      nodes {
        owner
      }
    }
    allNounSeeds(condition: { tokenId: $id }) {
      nodes {
        background
        body
        accessory
        head
        glasses
      }
    }
  }
`;

interface NounByIdQueryResult {
  allNouns: { nodes: { owner: string }[] };
  allNounSeeds: { nodes: IndexerNoun["seed"][] };
}

// A Noun minted since the indexer last polled (e.g. the one on auction) is read from the chain
async function getNounFromChain(id: string): Promise<IndexerNoun | undefined> {
  try {
    const [owner, seed] = await multicall(CHAIN_CONFIG.publicClient, {
      contracts: [
        { ...nounsNftTokenConfig, functionName: "ownerOf", args: [BigInt(id)] },
        { ...nounsNftTokenConfig, functionName: "seeds", args: [BigInt(id)] },
      ],
      allowFailure: false,
    });
    const [background, body, accessory, head, glasses] = seed;
    return { id, owner, seed: { background, body, accessory, head, glasses } };
  } catch {
    return undefined; // Not minted (or burned)
  }
}

export async function getNounByIdUncached(
  id: string,
): Promise<Noun | undefined> {
  const data = await indexerQuery<NounByIdQueryResult>(query, { id });
  const owner = data?.allNouns.nodes[0]?.owner;
  const seed = data?.allNounSeeds.nodes[0];

  const queryNoun =
    owner && seed ? { id, owner, seed } : await getNounFromChain(id);
  const noun = queryNoun ? transformQueryNounToNoun(queryNoun) : undefined;

  // Kickoff a check to revalidate all in grid (when its a new Noun)
  if (noun) {
    checkForAllNounRevalidation(id);
  }

  return noun;
}

const getNounByIdCached = unstable_cache(
  getNounByIdUncached,
  ["get-noun-by-id"],
  { revalidate: SECONDS_PER_HOUR },
);

export async function getNounById(id: string): Promise<Noun | undefined> {
  const noun = await getNounByIdCached(id);

  // Kickoff a check to revalidate all in grid (when its a new Noun)
  checkForAllNounRevalidation(id);

  return noun;
}
