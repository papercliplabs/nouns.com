"use server";
import { BigIntString } from "@/utils/types";
import { CHAIN_CONFIG } from "@/config";
import { nounsAuctionHouseAbi } from "@/abis/nounsAuctionHouse";
import { readContract } from "viem/actions";
import { unstable_cache } from "next/cache";

async function fetchCurrentAuctionNounId(): Promise<BigIntString> {
  const auction = await readContract(CHAIN_CONFIG.publicClient, {
    address: CHAIN_CONFIG.addresses.nounsAuctionHouseProxy,
    abi: nounsAuctionHouseAbi,
    functionName: "auction",
  });
  return auction.nounId.toString();
}

// Auction ID changes ~daily. Short TTL provides stale-while-revalidate
// resilience: if the RPC is temporarily down, the cached value (still
// correct) is served instead of crashing every page that uses this.
export const getCurrentAuctionNounId = unstable_cache(
  fetchCurrentAuctionNounId,
  ["get-current-auction-noun-id"],
  { revalidate: 60 },
);
