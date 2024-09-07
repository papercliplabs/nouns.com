import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialogBase";
import { Bid } from "@/data/auction/types";
import { formatEther } from "viem";
import { ReactNode } from "react";
import { LinkExternal } from "../ui/link";
import { CHAIN_CONFIG } from "@/config";
import { UserAvatar, UserName, UserRoot } from "../User/UserClient";
import { formatTokenAmount } from "@/utils/utils";
import { formatNumber } from "@/utils/format";

interface BidHistoryDialogProps {
  nounId: string;
  bids: Bid[];
  children: ReactNode;
}

export function BidHistoryDialog({ children, nounId, bids }: BidHistoryDialogProps) {
  return (
    <Dialog>
      <DialogTrigger className="clickable-active label-sm text-content-secondary flex self-center underline hover:brightness-75 md:self-start">
        {children}
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] max-w-[min(425px,95vw)] flex-col overflow-y-auto p-0">
        <h4 className="p-6 pb-0">Bids for Noun {nounId}</h4>
        <div className="flex max-h-[60vh] flex-col overflow-y-auto pb-10">
          {bids.map((bid, i) => {
            const date = new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
            }).format(Number(bid.timestamp) * 1000);
            return (
              <LinkExternal
                key={i}
                className="label-lg hover:bg-background-secondary flex w-full min-w-0 items-center justify-between gap-2 px-6 py-3 hover:brightness-100"
                href={`${CHAIN_CONFIG.chain.blockExplorers?.default.url}/tx/${bid.transactionHash}`}
              >
                <UserRoot address={bid.bidderAddress} disableLink>
                  <UserAvatar imgSize={40} className="h-[40px] w-[40px]" />
                  <div className="flex flex-col">
                    <UserName />
                    <span className="paragraph-sm text-content-secondary">{date}</span>
                  </div>
                </UserRoot>
                <div className="flex items-center gap-2">
                  <span className="text-content-secondary shrink-0 pl-6">
                    {formatNumber({
                      input: Number(formatEther(BigInt(bid.amount))),
                      unit: "Ξ",
                    })}
                  </span>
                </div>
              </LinkExternal>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
