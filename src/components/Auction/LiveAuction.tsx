"use client";
import { formatTimeLeft, formatTimestamp } from "@/utils/format";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { Skeleton } from "../ui/skeleton";
import Bid from "./Bid";
import { formatNumber } from "@/utils/format";
import { AuctionDetailTemplate } from "./AuctionDetailsTemplate";
import { Auction } from "@/data/auction/types";
import { BidHistoryDialog } from "./BidHistoryDialog";
import { Client } from "@/data/ponder/client/getClients";
import { Name } from "@paperclip-labs/whisk-sdk/identity";

export function LiveAuction({
  auction,
  clients,
}: {
  auction: Auction;
  clients: Client[];
}) {
  const [timeRemainingS, setTimeRemainingS] = useState<number | undefined>(
    Math.max(Number(auction.endTime) - Date.now() / 1000, 0)
  );
  const [showLocalTime, setShowLocalTime] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemainingS(Math.max(Number(auction.endTime) - Date.now() / 1000, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [auction.endTime, setTimeRemainingS]);

  const highestBid = auction.bids[0];

  return (
    <>
      <div className="flex w-full flex-col gap-2 md:w-fit">
        <AuctionDetailTemplate
          item1={{
            title: "Current bid",
            value: formatNumber({
              input: Number(formatEther(highestBid ? BigInt(highestBid.amount) : BigInt(0))),
              unit: "ETH",
            }),
          }}
          item2={{
            title: showLocalTime
              ? `Ends on ${formatTimestamp({ timestamp: Number(auction.endTime) * 1000, showMonth: true, showDay: true })} at`
              : "Time left",
            value: (
              <>
                {timeRemainingS != undefined ? (
                  <span suppressHydrationWarning className="flex w-full">
                    {showLocalTime
                      ? formatTimestamp({ timestamp: Number(auction.endTime) * 1000, showTime: true })
                      : formatTimeLeft(timeRemainingS)}
                  </span>
                ) : (
                  <Skeleton className="w-[100px] whitespace-pre-wrap"> </Skeleton>
                )}
              </>
            ),
            onClick: () => setShowLocalTime((prev) => !prev),
          }}
        />
      </div>
      <Bid nounId={BigInt(auction.nounId)} nextMinBid={BigInt(auction.nextMinBid)} />
      {auction.bids.length > 0 && (
        <BidHistoryDialog nounId={auction.nounId} bids={auction.bids} clients={clients}>
          <span className="flex w-full whitespace-pre-wrap md:w-fit">
            Highest bidder <Name address={auction.bids[0].bidderAddress} />
          </span>
        </BidHistoryDialog>
      )}
    </>
  );
}
