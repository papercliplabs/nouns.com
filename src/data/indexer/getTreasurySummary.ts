import { unstable_cache } from "next/cache";
import { getDailyFinancialSnapshots } from "./getDailyFinancialSnapshots";
import { SECONDS_PER_DAY } from "@/utils/constants";

interface TreasurySummary {
  treasuryBalanceInUsd: number;
  treasuryBalanceInEth: number;

  auctionRevenueInUsd: number;
  auctionRevenueInEth: number;

  propSpendInUsd: number;
  propSpendInEth: number;
}

async function getTreasurySummaryUncached(): Promise<TreasurySummary> {
  const data = await getDailyFinancialSnapshots();
  const lastEntry = data[data.length - 1];
  if (!lastEntry) {
    throw new Error("getTreasurySummary: no data"); // Don't cache a failed read
  }

  const treasuryBalanceInEth = lastEntry.treasuryBalanceInEth;
  const treasuryBalanceInUsd = lastEntry.treasuryBalanceInUsd;

  let auctionRevenueInUsd = 0;
  let auctionRevenueInEth = 0;
  let propSpendInUsd = 0;
  let propSpendInEth = 0;

  for (const entry of data) {
    auctionRevenueInUsd += entry.auctionRevenueInUsd;
    auctionRevenueInEth += entry.auctionRevenueInEth;
    propSpendInUsd += entry.propSpendInUsd;
    propSpendInEth += entry.propSpendInEth;
  }

  return {
    treasuryBalanceInEth,
    treasuryBalanceInUsd,
    auctionRevenueInEth,
    auctionRevenueInUsd,
    propSpendInEth,
    propSpendInUsd,
  };
}

const getTreasurySummaryCached = unstable_cache(
  getTreasurySummaryUncached,
  ["get-treasury-summary"],
  { revalidate: SECONDS_PER_DAY / 2 },
);

export async function getTreasurySummary(): Promise<
  TreasurySummary | undefined
> {
  return getTreasurySummaryCached().catch((e) => {
    console.error(e);
    return undefined;
  });
}
