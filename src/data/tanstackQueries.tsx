import { BigIntString } from "@/utils/types";
import { Auction } from "./auction/types";
import { Noun } from "./noun/types";
import { safeFetch } from "@/utils/safeFetch";

export function currentAuctionIdQuery() {
  return {
    queryKey: ["current-auction-id"],
    queryFn: async () => await safeFetch<string>("/api/auction/currentId"),
  };
}

export function auctionQuery(id?: BigIntString) {
  return {
    queryKey: ["auction", id],
    queryFn: async () => await safeFetch<Auction>(`/api/auction/${id}`),
  };
}

export function nounQuery(id?: BigIntString) {
  return {
    queryKey: ["noun", id],
    queryFn: async () => await safeFetch<Noun>(`/api/noun/${id}`),
  };
}

export function nogsQuery(nounId: string) {
  return {
    queryKey: ["nogs", nounId],
    queryFn: async () => await safeFetch<number>(`/api/noun/${nounId}/nogs`),
  };
}

