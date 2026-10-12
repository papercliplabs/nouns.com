"use server";
import { unstable_cache } from "next/cache";
import { indexerQueryAll, toUnixSeconds } from "./client";

interface Transaction {
  hash: string;
  timestamp: number;
}

type DepositActivity = {
  type: "deposit";
  depositorAccountAddress: string;
  nounsNftId: string;
  transaction: Transaction;
};
type RedeemActivity = {
  type: "redeem";
  redeemerAccountAddress: string;
  nounsNftId: string;
  transaction: Transaction;
};
type SwapActivity = {
  type: "swap";
  swapperAccountAddress: string;
  fromNounsNftId: string;
  toNounsNftId: string;
  transaction: Transaction;
};

export type ActivityEntry = DepositActivity | RedeemActivity | SwapActivity;

const EVENT_FIELDS = "to txHash blockTimestamp";
type EventNode = { to: string; txHash: string; blockTimestamp: string };

// $nouns deposits, redeems and swaps, one entry per Noun moved
async function getActivityUncached(): Promise<ActivityEntry[]> {
  const [deposits, redeems, swaps] = await Promise.all([
    indexerQueryAll<EventNode & { tokenIds: string[] }>(
      "allDeposits",
      `tokenIds ${EVENT_FIELDS}`,
    ),
    indexerQueryAll<EventNode & { tokenIds: string[] }>(
      "allRedeems",
      `tokenIds ${EVENT_FIELDS}`,
    ),
    indexerQueryAll<EventNode & { tokensIn: string[]; tokensOut: string[] }>(
      "allSwaps",
      `tokensIn tokensOut ${EVENT_FIELDS}`,
    ),
  ]);

  const transaction = (node: EventNode) => ({
    hash: node.txHash,
    timestamp: toUnixSeconds(node.blockTimestamp),
  });

  const data: ActivityEntry[] = [
    ...(deposits ?? []).flatMap((node) =>
      node.tokenIds.map(
        (id): DepositActivity => ({
          type: "deposit",
          depositorAccountAddress: node.to,
          nounsNftId: id,
          transaction: transaction(node),
        }),
      ),
    ),
    ...(redeems ?? []).flatMap((node) =>
      node.tokenIds.map(
        (id): RedeemActivity => ({
          type: "redeem",
          redeemerAccountAddress: node.to,
          nounsNftId: id,
          transaction: transaction(node),
        }),
      ),
    ),
    ...(swaps ?? []).flatMap((node) =>
      node.tokensIn.map(
        (id, i): SwapActivity => ({
          type: "swap",
          swapperAccountAddress: node.to,
          fromNounsNftId: id,
          toNounsNftId: node.tokensOut[i],
          transaction: transaction(node),
        }),
      ),
    ),
  ];

  data.sort((a, b) => b.transaction.timestamp - a.transaction.timestamp);

  return data;
}

// Every 15min, want this to be more real time
export const getActivity = unstable_cache(
  getActivityUncached,
  ["get-activity"],
  { revalidate: 60 * 15 },
);
