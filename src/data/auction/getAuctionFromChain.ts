import { CHAIN_CONFIG } from "@/config";
import { nounsAuctionHouseAbi } from "@/abis/nounsAuctionHouse";
import { BigIntString } from "@/utils/types";
import {
  Hex,
  getAddress,
  hexToBigInt,
  numberToHex,
  pad,
  parseEventLogs,
  toEventSelector,
} from "viem";
import { getBlock } from "viem/actions";
import { Bid } from "./types";

const AUCTION_HOUSE_START_BLOCK = BigInt(12985451);

const AUCTION_EVENT_NAMES = [
  "AuctionCreated",
  "AuctionExtended",
  "AuctionBid",
  "AuctionBidWithClientId",
  "AuctionSettled",
];
const AUCTION_EVENTS = nounsAuctionHouseAbi.filter(
  (
    item,
  ): item is Extract<
    (typeof nounsAuctionHouseAbi)[number],
    { type: "event" }
  > => item.type == "event" && AUCTION_EVENT_NAMES.includes(item.name),
);

type RpcLog = {
  address: Hex;
  topics: [Hex, ...Hex[]];
  data: Hex;
  blockNumber: Hex;
  transactionHash: Hex;
  logIndex: Hex;
  blockTimestamp?: Hex; // Returned by most providers, otherwise looked up
};

export interface ChainAuction {
  nounId: BigIntString;
  startTime: BigIntString;
  endTime: BigIntString;
  settled: boolean;
  bids: Bid[];
}

// Reads one auction straight from the chain: a single eth_getLogs for every auction house event about this Noun
// (nounId is the first indexed topic on all of them). Used for the live auction and anything the indexer hasn't
// picked up yet.
export async function getAuctionFromChain(
  nounId: BigIntString,
): Promise<ChainAuction | undefined> {
  const rawLogs = (await CHAIN_CONFIG.publicClient.request({
    method: "eth_getLogs",
    params: [
      {
        address: CHAIN_CONFIG.addresses.nounsAuctionHouseProxy,
        fromBlock: numberToHex(AUCTION_HOUSE_START_BLOCK),
        toBlock: "latest",
        topics: [
          AUCTION_EVENTS.map((event) => toEventSelector(event)),
          pad(numberToHex(BigInt(nounId))),
        ],
      },
    ],
  } as any)) as RpcLog[];

  const logs = parseEventLogs({
    abi: AUCTION_EVENTS,
    logs: rawLogs as any,
    strict: false,
  });

  let startTime: bigint | undefined;
  let endTime = BigInt(0);
  let settled = false;
  const clientIdByBidValue = new Map<string, number>();
  const bidLogs: { log: RpcLog; sender: Hex; value: bigint }[] = [];

  logs.forEach((log, i) => {
    switch (log.eventName) {
      case "AuctionCreated":
        startTime = log.args.startTime;
        if (log.args.endTime && log.args.endTime > endTime)
          endTime = log.args.endTime;
        break;
      case "AuctionExtended":
        if (log.args.endTime && log.args.endTime > endTime)
          endTime = log.args.endTime;
        break;
      case "AuctionBid":
        bidLogs.push({
          log: rawLogs[i],
          sender: log.args.sender!,
          value: log.args.value!,
        });
        break;
      case "AuctionBidWithClientId":
        clientIdByBidValue.set(
          log.args.value!.toString(),
          Number(log.args.clientId),
        );
        break;
      case "AuctionSettled":
        settled = true;
        break;
    }
  });

  if (startTime == undefined) {
    return undefined;
  }

  const timestamps = await getBlockTimestamps(bidLogs.map(({ log }) => log));

  const bids: Bid[] = bidLogs.map(({ log, sender, value }) => ({
    transactionHash: log.transactionHash,
    bidderAddress: getAddress(sender),
    amount: value.toString(),
    timestamp: timestamps.get(log.blockNumber)!.toString(),
    clientId: clientIdByBidValue.get(value.toString()),
  }));

  return {
    nounId,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
    settled,
    bids,
  };
}

async function getBlockTimestamps(logs: RpcLog[]): Promise<Map<Hex, bigint>> {
  const timestamps = new Map<Hex, bigint>();
  for (const log of logs) {
    if (log.blockTimestamp) {
      timestamps.set(log.blockNumber, hexToBigInt(log.blockTimestamp));
    }
  }

  const missing = Array.from(
    new Set(logs.map((log) => log.blockNumber)),
  ).filter((block) => !timestamps.has(block));
  const blocks = await Promise.all(
    missing.map((blockNumber) =>
      getBlock(CHAIN_CONFIG.publicClient, {
        blockNumber: hexToBigInt(blockNumber),
      }),
    ),
  );
  blocks.forEach((block, i) => timestamps.set(missing[i], block.timestamp));

  return timestamps;
}
