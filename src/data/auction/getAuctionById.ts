"use server";
import { BigIntString } from "@/utils/types";
import { Auction, Bid } from "./types";
import { Hex, getAddress } from "viem";
import { getProtocolParams } from "../protocol/getProtocolParams";
import { bigIntMax } from "@/utils/bigint";
import { revalidateTag, unstable_cache } from "next/cache";
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

const getAuctionByIdCached = unstable_cache(
  getAuctionByIdUncached,
  ["get-auction-by-id"],
  {
    tags: ["get-auction-by-id"],
  },
);

export async function getAuctionById(id: BigIntString) {
  const cachedAuction = await getAuctionByIdCached(id);

  if (cachedAuction?.state != "ended-settled") {
    revalidateTag("get-auction-by-id");
    return await getAuctionByIdCached(id);
  }

  return cachedAuction;
}
