"use server";
import { CHAIN_CONFIG } from "@/config";
import { BigIntString } from "@/utils/types";
import { Auction, Bid } from "./types";
import { Hex, getAddress } from "viem";
import { getProtocolParams } from "../protocol/getProtocolParams";
import { bigIntMax } from "@/utils/bigint";
import { revalidateTag, unstable_cache } from "next/cache";
import { graphQLFetch } from "../utils/graphQLFetch";
import { TypedDocumentString } from "../generated/ponder/graphql";

const NOUNDER_AUCTION_CUTOFF = BigInt(1820);

interface PonderAuctionResult {
  auction: {
    nounsNftId: string;
    startTimestamp: number;
    endTimestamp: number;
    settled: boolean;
    bids: {
      items: Array<{
        transactionHash: string;
        bidderAccountAddress: string;
        amount: string;
        timestamp: number;
        clientId: number | null;
      }>;
    };
  } | null;
}

interface PonderAuctionVariables {
  nounId: string;
}

const ponderAuctionQuery = new TypedDocumentString<
  PonderAuctionResult,
  PonderAuctionVariables
>(`
  query AuctionById($nounId: BigInt!) {
    auction(nounsNftId: $nounId) {
      nounsNftId
      startTimestamp
      endTimestamp
      settled
      bids(limit: 1000, orderBy: "amount", orderDirection: "desc") {
        items {
          transactionHash
          bidderAccountAddress
          amount
          timestamp
          clientId
        }
      }
    }
  }
`);

async function getAuctionByIdUncached(
  id: BigIntString,
): Promise<Auction | undefined> {
  if (BigInt(id) <= NOUNDER_AUCTION_CUTOFF && BigInt(id) % 10n === 0n) {
    const nextNoun = await getAuctionByIdUncached(
      (BigInt(id) + 1n).toString(),
    );
    return {
      nounId: id,

      startTime: nextNoun?.startTime ?? "0",
      endTime: nextNoun?.startTime ?? "0",

      nextMinBid: "0",

      state: "ended-settled",

      bids: [],

      nounderAuction: true,
    };
  }

  const [result, params] = await Promise.all([
    graphQLFetch(
      CHAIN_CONFIG.ponderIndexerUrl,
      ponderAuctionQuery,
      { nounId: id },
      { cache: "no-cache" },
    ),
    getProtocolParams(),
  ]);

  const auction = result?.auction;
  if (!auction) {
    console.error("getAuctionByIdUncached - no auction found", id);
    return undefined;
  }

  const bids: Bid[] = auction.bids.items.map((bid) => ({
    transactionHash: bid.transactionHash as Hex,
    bidderAddress: getAddress(bid.bidderAccountAddress),
    amount: bid.amount,
    timestamp: bid.timestamp.toString(),
    clientId: bid.clientId ?? undefined,
  }));

  // Sort descending by amount
  bids.sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));

  const highestBidAmount =
    bids.length > 0 ? BigInt(bids[0].amount) : 0n;
  const nextMinBid = bigIntMax(
    BigInt(params.reservePrice),
    highestBidAmount +
      (highestBidAmount * BigInt(params.minBidIncrementPercentage)) / 100n,
  );

  const nowS = Date.now() / 1000;
  const ended = nowS > Number(auction.endTimestamp);

  let state: Auction["state"];
  if (!ended) {
    state = "live";
  } else if (auction.settled) {
    state = "ended-settled";
  } else {
    state = "ended-unsettled";
  }

  return {
    nounId: auction.nounsNftId,
    startTime: auction.startTimestamp.toString(),
    endTime: auction.endTimestamp.toString(),
    nextMinBid: nextMinBid.toString(),
    state,
    bids,
    nounderAuction: false,
  };
}

const getAuctionByIdCached = unstable_cache(
  getAuctionByIdUncached,
  ["get-auction-by-id"],
  {
    tags: ["get-auction-by-id"],
  },
);

export async function getAuctionById(id: BigIntString): Promise<Auction | undefined> {
  const cachedAuction = await getAuctionByIdCached(id);

  if (cachedAuction?.state !== "ended-settled") {
    revalidateTag("get-auction-by-id");
    return await getAuctionByIdCached(id);
  }

  return cachedAuction;
}
