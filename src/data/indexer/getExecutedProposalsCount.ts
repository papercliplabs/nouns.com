"use server";
import { SECONDS_PER_DAY } from "@/utils/constants";
import { indexerQuery } from "./client";

// "Ideas funded": executed proposals, excluding staking and DAO migration proposals
export async function getExecutedProposalsCount(): Promise<number> {
  const data = await indexerQuery<{
    allDaoStats: { nodes: { executedProposals: string }[] };
  }>(`{ allDaoStats { nodes { executedProposals } } }`, undefined, {
    next: { revalidate: SECONDS_PER_DAY },
  });

  return Number(data?.allDaoStats.nodes[0]?.executedProposals ?? 0);
}
