"use server";
import { graphql } from "@/data/generated/ponder";
import { graphQLFetch } from "@/data/utils/graphQLFetch";
import { CHAIN_CONFIG } from "@/config";

const query = graphql(/* GraphQL */ `
  query AuctionByNounId($nounId: BigInt!) {
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

export async function fetchAuctionByNounId(nounId: string) {
  return graphQLFetch(
    CHAIN_CONFIG.ponderIndexerUrl,
    query,
    { nounId },
    { cache: "no-cache" },
  );
}
