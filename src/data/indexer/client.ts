import { CHAIN_CONFIG } from "@/config";
import { CacheConfig } from "../utils/graphQLFetch";
import { safeFetch } from "@/utils/safeFetch";

// The rindexer GraphQL API (nounswap-backend/rindexer). It polls slowly (~15 min), so anything that has to
// be current (the live auction) reads the chain instead. uint256 values come back as strings.

const PAGE_SIZE = 1000; // rindexer's max page size

type GraphQLResponse<Data> = { data: Data } | { errors: { message: string }[] };

export async function indexerQuery<Result>(
  query: string,
  variables?: Record<string, unknown>,
  cacheConfig?: CacheConfig,
): Promise<Result | null> {
  const result = await safeFetch<GraphQLResponse<Result>>(
    CHAIN_CONFIG.indexerUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: cacheConfig?.cache,
      next: cacheConfig?.next ?? { revalidate: 0 },
    },
  );

  if (!result) {
    return null;
  }

  if ("errors" in result) {
    console.error(
      "Indexer error:",
      result.errors[0]?.message,
      query,
      JSON.stringify(variables),
    );
    return null;
  }

  return result.data;
}

// Fetches every node of a connection, e.g. indexerQueryAll("allNouns", "tokenId owner").
// Returns null if any page fails, so callers never act on partial data.
export async function indexerQueryAll<Node>(
  connection: string,
  fields: string,
  args?: string, // Extra connection arguments, e.g. `filter: { ... }, orderBy: TOKEN_ID_ASC`
): Promise<Node[] | null> {
  const query = /* GraphQL */ `
    query Page($after: Cursor) {
      page: ${connection}(first: ${PAGE_SIZE}, after: $after${args ? `, ${args}` : ""}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ${fields}
        }
      }
    }
  `;

  let nodes: Node[] = [];
  let after: string | null = null;
  while (true) {
    const data: {
      page: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Node[];
      };
    } | null = await indexerQuery(query, { after });
    if (!data) {
      return null;
    }

    nodes = nodes.concat(data.page.nodes);

    if (!data.page.pageInfo.hasNextPage || !data.page.pageInfo.endCursor) {
      return nodes;
    }
    after = data.page.pageInfo.endCursor;
  }
}

// rindexer timestamps are ISO strings, the app uses unix seconds
export function toUnixSeconds(isoTimestamp: string): number {
  return Math.floor(new Date(isoTimestamp).getTime() / 1000);
}
