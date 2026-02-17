"use server";
import { Noun } from "./types";
import { checkForAllNounRevalidation } from "./getAllNouns";
import { graphql } from "../generated/gql";
import { graphQLFetchWithFallback } from "../utils/graphQLFetch";
import { CHAIN_CONFIG } from "@/config";
import { transformQueryNounToNoun } from "./helpers";
import { unstable_cache } from "next/cache";
import { SECONDS_PER_HOUR } from "@/utils/constants";

const query = graphql(/* GraphQL */ `
  query NounById($id: ID!) {
    noun(id: $id) {
      id
      owner {
        id
      }
      seed {
        background
        body
        accessory
        head
        glasses
      }
    }
  }
`);

export async function getNounByIdUncached(id: string): Promise<Noun | undefined> {
  const response = await graphQLFetchWithFallback(CHAIN_CONFIG.subgraphUrl, query, { id }, { next: { revalidate: 0 } });
  const noun = response ? transformQueryNounToNoun(response.noun as any) : undefined;

  // Kickoff a check to revalidate all in grid (when its a new Noun)
  checkForAllNounRevalidation(id);

  return noun;
}

const getNounByIdCached = unstable_cache(getNounByIdUncached, ["get-noun-by-id"], { revalidate: SECONDS_PER_HOUR });

export async function getNounById(id: string): Promise<Noun | undefined> {
  const noun = await getNounByIdCached(id);

  // Kickoff a check to revalidate all in grid (when its a new Noun)
  checkForAllNounRevalidation(id);

  return noun;
}
