"use server";
import { SECONDS_PER_DAY } from "@/utils/constants";
import { formatEther } from "viem";
import { unstable_cache } from "next/cache";
import { indexerQueryAll } from "./client";

const CLIENT_INFO: Record<number, { url: string; icon: string } | undefined> = {
  1: {
    url: "https://studio.noundry.wtf",
    icon: "https://studio.noundry.wtf/favicon.ico",
  },
  2: { url: "https://houseofnouns.wtf", icon: "/client/unknown.svg" },
  3: { url: "https://www.nouns.camp", icon: "/client/camp.png" },
  4: { url: "https://nouns.biz", icon: "/client/unknown.svg" },
  5: { url: "/", icon: "/app-icon.jpeg" },
  6: { url: "https://www.nouns.game", icon: "/client/game.png" },
  7: { url: "https://nouns.sh", icon: "/client/sh.png" },
  8: { url: "https://nouns.gg", icon: "https://nouns.gg/logo/logo.svg" },
  9: { url: "https://www.probe.wtf", icon: "/client/probe.svg" },
  10: {
    url: "https://nounsagora.com",
    icon: "https://nounsagora.com/favicon.ico",
  },
  11: { url: "https://nouns.farm", icon: "/client/unknown.svg" },
  12: { url: "https://proplaunchpad.com", icon: "/client/unknown.svg" },
  13: { url: "https://www.etherscan.io", icon: "/client/etherscan.png" },
  14: { url: "https://pronouns.gg", icon: "https://pronouns.gg/favicon.ico" },
  15: { url: "https://nouns.auction", icon: "/client/unknown.svg" },
  16: {
    url: "https://lighthouse.cx",
    icon: "https://lighthouse.cx/favicon.ico",
  },
  17: { url: "https://protocol.nouns.camp", icon: "/client/camp.png" },
  18: { url: "https://anouns.eth.limo/", icon: "/client/unknown.svg" },
  19: { url: "https://www.etherscan.io", icon: "/client/etherscan.png" },
};

export interface Client {
  id: number;
  name: string;
  approved: boolean;

  rewardAmountEth: number;

  auctionsWon: number;
  votesCast: number;
  proposalsCreated: number;

  url?: string;
  icon?: string;
}

// Clients only change when someone registers, bids, votes or proposes through one, so a twice-daily refresh is plenty
async function getClientsUncached(): Promise<Client[]> {
  const [names, approvals, rewards, auctionWins, proposals, votes] =
    await Promise.all([
      indexerQueryAll<{ clientId: number; name: string }>(
        "allClientNames",
        "clientId name",
      ),
      indexerQueryAll<{ clientId: number; approved: boolean }>(
        "allClientApprovals",
        "clientId approved",
      ),
      indexerQueryAll<{ clientId: number; rewardAmount: string }>(
        "allClientRewards",
        "clientId rewardAmount",
      ),
      indexerQueryAll<{ clientId: number; auctionsWon: string }>(
        "allClientAuctionWins",
        "clientId auctionsWon",
      ),
      indexerQueryAll<{ clientId: number; proposalsCreated: string }>(
        "allClientProposals",
        "clientId proposalsCreated",
      ),
      indexerQueryAll<{ clientId: number; votes: string }>(
        "allClientVotes",
        "clientId votes",
      ),
    ]);

  if (
    !names ||
    !approvals ||
    !rewards ||
    !auctionWins ||
    !proposals ||
    !votes
  ) {
    throw new Error("getClients: indexer query failed"); // Don't cache a failed read
  }

  const byId = <T extends { clientId: number }>(rows: T[]) =>
    new Map(rows.map((row) => [row.clientId, row]));
  const approvalById = byId(approvals);
  const rewardById = byId(rewards);
  const auctionWinsById = byId(auctionWins);
  const proposalsById = byId(proposals);

  const votesCastById = new Map<number, number>();
  for (const vote of votes) {
    votesCastById.set(
      vote.clientId,
      (votesCastById.get(vote.clientId) ?? 0) + Number(vote.votes),
    );
  }

  return names
    .map(({ clientId, name }) => {
      const clientInfo = CLIENT_INFO[clientId];

      return {
        id: clientId,
        name,
        approved: approvalById.get(clientId)?.approved ?? false,

        rewardAmountEth: Number(
          formatEther(BigInt(rewardById.get(clientId)?.rewardAmount ?? "0")),
        ),

        auctionsWon: Number(auctionWinsById.get(clientId)?.auctionsWon ?? 0),
        votesCast: votesCastById.get(clientId) ?? 0,
        proposalsCreated: Number(
          proposalsById.get(clientId)?.proposalsCreated ?? 0,
        ),

        url: clientInfo?.url,
        icon: clientInfo?.icon,
      };
    })
    .sort((a, b) => a.id - b.id);
}

const getClientsCached = unstable_cache(getClientsUncached, ["get-clients"], {
  revalidate: SECONDS_PER_DAY / 2,
});

export async function getClients(): Promise<Client[]> {
  return getClientsCached().catch((e) => {
    console.error(e);
    return [];
  });
}

export async function getClientForId(id: number): Promise<Client | undefined> {
  const clients = await getClients();
  return clients.find((client) => client.id == id);
}
