"use client";
import { NounImageBase } from "../NounImage";
import { formatNumber, formatTimeLeft } from "@/utils/format";
import { formatEther } from "viem";
import clsx from "clsx";
import { useAuctionData } from "@/hooks/useAuctionData";
import { Skeleton } from "../ui/skeleton";

export function CurrentAuctionLarge() {
  const { auction, noun, timeRemainingS } = useAuctionData();

  const isLoading = !auction;

  const items: { title: string; value: string | null }[] = [
    {
      title: "Current bid",
      value: isLoading
        ? null
        : formatNumber({
            input: Number(
              formatEther(
                auction.bids[0]?.amount
                  ? BigInt(auction.bids[0].amount)
                  : BigInt(0),
              ),
            ),
            unit: "ETH",
          }),
    },
    {
      title: "Time left",
      value: timeRemainingS != null ? formatTimeLeft(timeRemainingS) : null,
    },
  ];

  return (
    <div
      className={clsx(
        "flex w-full flex-col items-center justify-center",
        noun?.traits.background.seed == 1 ? "bg-nouns-warm" : "bg-nouns-cool",
      )}
    >
      <NounImageBase noun={noun ?? undefined} width={156} height={156} />
      <div className="flex w-full max-w-[336px] gap-2 rounded-[14px] bg-white p-1">
        {items.map((item, i) => (
          <div
            className="flex w-full min-w-0 flex-1 flex-col items-center justify-center rounded-[11px] bg-gray-100 px-4 py-2.5 text-center"
            key={i}
          >
            <span className="text-content-secondary label-sm">
              {item.title}
            </span>
            {item.value != null ? (
              <span className="heading-6">{item.value}</span>
            ) : (
              <Skeleton className="mt-1 h-5 w-20" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CurrentAuctionSmall() {
  const { noun, timeRemainingS } = useAuctionData();

  return (
    <div className="flex items-center gap-2 label-md">
      <div>{timeRemainingS != undefined && formatTimeLeft(timeRemainingS)}</div>
      <NounImageBase
        noun={noun ?? undefined}
        width={32}
        height={32}
        className={clsx(
          "rounded-[6px]",
          noun?.traits.background.seed == 1 ? "bg-nouns-warm" : "bg-nouns-cool",
        )}
      />
    </div>
  );
}
