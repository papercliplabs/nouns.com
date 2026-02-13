"use server";
import { graphql } from "@/data/generated/ponder";
import { graphQLFetch } from "@/data/utils/graphQLFetch";
import { CHAIN_CONFIG } from "@/config";

const query = graphql(/* GraphQL */ `
  query NounSwapProposals($proposer: String!) {
    proposals(
      limit: 1000
      where: { proposerAddress: $proposer, title_contains: "NounSwap" }
      orderBy: "id"
      orderDirection: "desc"
    ) {
      items {
        id
        title
        description
        proposerAddress
        quorumVotes
        forVotes
        againstVotes
        lastKnownState
        votingStartBlock
        votingEndBlock
      }
    }
  }
`);

export async function fetchNounSwapProposals(proposer: string) {
  return graphQLFetch(
    CHAIN_CONFIG.ponderIndexerUrl,
    query,
    { proposer },
    { cache: "no-cache" },
  );
}
