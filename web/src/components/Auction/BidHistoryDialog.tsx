import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialogBase";
import { Bid } from "@/data/auction/types";
import { formatEther } from "viem";
import { ReactNode } from "react";
import { LinkExternal } from "../ui/link";
import { CHAIN_CONFIG } from "@/config";
import { formatNumber } from "@/utils/format";
import { Client } from "@/data/ponder/client/getClients";
import Image from "next/image";
import { Avatar, Name } from "@paperclip-labs/whisk-sdk/identity";

interface BidHistoryDialogProps {
  nounId: string;
  bids: Bid[];
  children: ReactNode;
  clients: Client[];
}

export function BidHistoryDialog({ children, nounId, bids, clients }: BidHistoryDialogProps) {
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

            const client = clients.find((client) => client.id == bid.clientId);

            return (
              <LinkExternal
                key={i}
                className="label-lg hover:bg-background-secondary flex w-full min-w-0 items-center justify-between gap-2 px-6 py-3 hover:brightness-100"
                href={`${CHAIN_CONFIG.chain.blockExplorers?.default.url}/tx/${bid.transactionHash}`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar address={bid.bidderAddress} size={40} />
                    {client?.icon && (
                      <Image
                        src={client.icon}
                        width={16}
                        height={16}
                        alt=""
                        className="bg-background-primary absolute bottom-0 right-0 rounded-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Name address={bid.bidderAddress} />
                    <span className="paragraph-sm text-content-secondary">{date}</span>
                  </div>
                </div>

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
