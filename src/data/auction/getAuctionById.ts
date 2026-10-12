"use server";
import { BigIntString } from "@/utils/types";
import { Auction, Bid } from "./types";
import { Hex, getAddress } from "viem";
import { getProtocolParams } from "../protocol/getProtocolParams";
import { bigIntMax } from "@/utils/bigint";
import { unstable_cache } from "next/cache";
import { indexerQuery, toUnixSeconds } from "../indexer/client";
import { getAuctionFromChain } from "./getAuctionFromChain";

const NOUNDER_AUCTION_CUTOFF = BigInt(1820);

const query = /* GraphQL */ `
  query Auction($nounId: BigFloat!, $nounIdString: String!) {
    allAuctions(condition: { nounId: $nounId }) {
      nodes {
        startTime
        endTime
        settledBlock
      }
    }
    allAuctionBids(filter: { nounId: { equalTo: $nounIdString } }) {
      nodes {
        sender
        value
        txHash
        blockTimestamp
      }
    }
    allAuctionBidWithClientIds(filter: { nounId: { equalTo: $nounIdString } }) {
      nodes {
        value
        clientId
      }
    }
  }
`;

interface AuctionQueryResult {
  allAuctions: {
    nodes: { startTime: string; endTime: string; settledBlock: string }[];
  };
  allAuctionBids: {
    nodes: {
      sender: string;
      value: string;
      txHash: string;
      blockTimestamp: string;
    }[];
  };
  allAuctionBidWithClientIds: { nodes: { value: string; clientId: string }[] };
}

// Settled auctions from the indexer. Returns undefined when the indexer hasn't seen the settlement yet.
async function getSettledAuctionFromIndexer(nounId: BigIntString) {
  const data = await indexerQuery<AuctionQueryResult>(query, {
    nounId,
    nounIdString: nounId,
  });
  const auction = data?.allAuctions.nodes[0];
  if (!data || !auction || auction.settledBlock == "0") {
    return undefined;
  }

  const clientIdByBidValue = new Map(
    data.allAuctionBidWithClientIds.nodes.map((node) => [
      node.value,
      Number(node.clientId),
    ]),
  );

  const bids: Bid[] = data.allAuctionBids.nodes.map((bid) => ({
    transactionHash: bid.txHash as Hex,
    bidderAddress: getAddress(bid.sender),
    amount: bid.value,
    timestamp: toUnixSeconds(bid.blockTimestamp).toString(),
    clientId: clientIdByBidValue.get(bid.value),
  }));

  return {
    nounId,
    startTime: auction.startTime,
    endTime: auction.endTime,
    settled: true,
    bids,
  };
}

async function getAuctionByIdUncached(
  id: BigIntString,
): Promise<Auction | undefined> {
  if (
    BigInt(id) <= NOUNDER_AUCTION_CUTOFF &&
    BigInt(id) % BigInt(10) == BigInt(0)
  ) {
    const nextNoun = await getAuctionByIdUncached(
      (BigInt(id) + BigInt(1)).toString(),
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

  // History comes from the indexer; the live auction (and anything settled since the indexer last polled) from the chain
  const [auction, params] = await Promise.all([
    getSettledAuctionFromIndexer(id).then(
      (auction) => auction ?? getAuctionFromChain(id),
    ),
    getProtocolParams(),
  ]);

  if (!auction) {
    console.error("getAuctionByIdUncached - no auction found", id);
    return undefined;
  }

  const bids = auction.bids;

  // Sort descending by amount
  bids.sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));

  const highestBidAmount = bids.length > 0 ? BigInt(bids[0].amount) : BigInt(0);
  const nextMinBid = bigIntMax(
    BigInt(params.reservePrice),
    highestBidAmount +
      (highestBidAmount * BigInt(params.minBidIncrementPercentage)) /
        BigInt(100),
  );

  const nowS = Date.now() / 1000;
  const ended = nowS > Number(auction.endTime);

  return {
    nounId: auction.nounId,

    startTime: auction.startTime,
    endTime: auction.endTime,

    nextMinBid: nextMinBid.toString(),

    state: ended
      ? auction.settled
        ? "ended-settled"
        : "ended-unsettled"
      : "live",

    bids,

    nounderAuction: false,
  } as Auction;
}

// The live auction (and one settled since the indexer last polled) is read from the chain, so it's cached briefly to
// keep RPC usage flat no matter how many people are watching
const LIVE_AUCTION_REVALIDATE_S = 30;

const getAuctionByIdShortCached = unstable_cache(
  getAuctionByIdUncached,
  ["get-auction-by-id-short"],
  { revalidate: LIVE_AUCTION_REVALIDATE_S },
);

// Settled auctions never change, so they're cached forever. Throws for anything not settled yet so it isn't cached.
const getSettledAuctionByIdCached = unstable_cache(
  async (id: BigIntString) => {
    const auction = await getAuctionByIdShortCached(id);
    if (auction?.state != "ended-settled") {
      throw new Error("Auction not settled yet");
    }
    return auction;
  },
  ["get-settled-auction-by-id"],
);

export async function getAuctionById(
  id: BigIntString,
): Promise<Auction | undefined> {
  try {
    return await getSettledAuctionByIdCached(id);
  } catch {
    return await getAuctionByIdShortCached(id);
  }
}
