import Image from "next/image";
import JoinAuction from "./JoinAuction";
import { CurrentAuctionPrefetchWrapper } from "@/components/CurrentAuction/CurrentAuctionPrefetchWrapper";
import FeatureHighlightCard from "@/components/FeatureHighlightCard";

export default function GetANoun() {
  return (
    <section className="flex w-full min-w-0 flex-col items-center justify-center gap-8 px-6 md:gap-16 md:px-10">
      <div className="flex max-w-[1600px] flex-col items-center justify-center gap-2 px-6 text-center md:px-10">
        <h2>Get a Noun!</h2>
        <div className="max-w-[480px] paragraph-lg">
          Bid, buy, or explore fractional ownership—choose the best way to make
          a Noun yours.
        </div>
      </div>

      <div className="flex w-full min-w-0 max-w-[1600px] flex-col gap-6 md:flex-row md:gap-10">
        <CurrentAuctionPrefetchWrapper>
          <JoinAuction />
        </CurrentAuctionPrefetchWrapper>
        <FeatureHighlightCard
          href="/explore"
          iconSrc="/feature/shop/icon.svg"
          buttonLabel="Explore"
          description="Browse the full collection of Nouns."
          className="bg-background-secondary"
        >
          <Image
            src="/feature/shop/main.png"
            width={400}
            height={332}
            alt="Buy Secondary Nouns"
            className="h-[332px] w-[400px] object-cover"
          />
        </FeatureHighlightCard>
      </div>
    </section>
  );
}
