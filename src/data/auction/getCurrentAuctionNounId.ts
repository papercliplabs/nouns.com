"use server";
import { BigIntString } from "@/utils/types";
import { readContract } from "viem/actions";
import { unstable_cache } from "next/cache";
import { nounsAuctionHouseConfig } from "../generated/wagmi";
import { CHAIN_CONFIG } from "@/config";

// Read from the chain so the auction transition never waits on the indexer
async function getCurrentAuctionNounIdUncached(): Promise<BigIntString> {
  try {
    const auction = await readContract(CHAIN_CONFIG.publicClient, {
      ...nounsAuctionHouseConfig,
      functionName: "auction",
    });
    return auction.nounId.toString();
  } catch (e) {
    console.error("getCurrentAuctionNounId - failed to read auction", e);
    return "1";
  }
}

export const getCurrentAuctionNounId = unstable_cache(
  getCurrentAuctionNounIdUncached,
  ["get-current-auction-noun-id", CHAIN_CONFIG.chain.id.toString()],
  { revalidate: 30 }, // No bidding in the app, so the next auction showing up within 30s is fine
);
