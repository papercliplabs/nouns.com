"use client";
import {
  auctionQuery,
  currentAuctionIdQuery,
  nounQuery,
} from "@/data/tanstackQueries";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuctionData() {
  const { data: auctionId } = useQuery({
    ...currentAuctionIdQuery(),
  });

  const { data: auction } = useQuery({
    ...auctionQuery(auctionId ?? undefined),
    enabled: !!auctionId,
    refetchInterval: 30 * 1000, // Matches the server cache
  });

  const { data: noun } = useQuery({
    ...nounQuery(auctionId ?? undefined),
    enabled: !!auctionId,
  });

  const [timeRemainingS, setTimeRemainingS] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (auction?.endTime) {
        setTimeRemainingS(
          Math.max(Number(auction.endTime) - Date.now() / 1000, 0),
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction?.endTime, setTimeRemainingS]);

  return { auction, noun, timeRemainingS };
}
