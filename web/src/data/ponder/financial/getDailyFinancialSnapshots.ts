"use server";
import { graphql } from "@/data/generated/ponder";
import { graphQLFetch } from "@/data/utils/graphQLFetch";
import { DailyFinancialSnapshotsQuery } from "@/data/generated/ponder/graphql";
import { SECONDS_PER_DAY } from "@/utils/constants";
import { CHAIN_CONFIG } from "@/config";
import { unstable_cache } from "next/cache";

const query = graphql(/* GraphQL */ `
  query DailyFinancialSnapshots($cursor: String) {
    dailyFinancialSnapshots(limit: 1000, orderBy: "timestamp", orderDirection: "asc", after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      items {
        timestamp

        treasuryBalanceInUsd
        treasuryBalanceInEth

        auctionRevenueInUsd
        auctionRevenueInEth

        propSpendInUsd
        propSpendInEth
      }
    }
  }
`);

async function runPaginatedQueryUncached() {
  console.log("CACHE BUSTED");
  let cursor: string | undefined | null = undefined;
  let items: DailyFinancialSnapshotsQuery["dailyFinancialSnapshots"]["items"] = [];
  while (true) {
    const data: DailyFinancialSnapshotsQuery = await graphQLFetch(
      CHAIN_CONFIG.ponderIndexerUrl,
      query,
      { cursor },
      {
        next: { revalidate: 0 },
      }
    );
    items = items.concat(data.dailyFinancialSnapshots.items);

    if (data.dailyFinancialSnapshots.pageInfo.hasNextPage && data.dailyFinancialSnapshots.pageInfo.endCursor) {
      cursor = data.dailyFinancialSnapshots.pageInfo.endCursor;
    } else {
      break;
    }
  }

  return items;
}

const runPaginatedQuery = unstable_cache(
  runPaginatedQueryUncached,
  ["get-daily-financial-snapshots", CHAIN_CONFIG.chain.id.toString()],
  { revalidate: SECONDS_PER_DAY / 2 }
);

export async function getDailyFinancialSnapshots() {
  const data = await runPaginatedQuery();
  return data;
}
