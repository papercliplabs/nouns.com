import AnimateIn from "@/components/AnimateIn";
import DataMetric from "@/components/DataMetric";
import { CHAIN_CONFIG } from "@/config";
import { getAllNouns } from "@/data/noun/getAllNouns";
import { Suspense } from "react";
import { isAddressEqual } from "viem";

const $NOUNS_PER_NOUN = 1000000;

export default function Stats() {
  return (
    <AnimateIn delayS={0.8} className="flex w-full items-center justify-center">
      <section className="flex w-full max-w-[1360px] items-center justify-evenly px-6 md:px-10">
        <Suspense fallback={null}>
          <DataWrapper />
        </Suspense>
      </section>
    </AnimateIn>
  );
}

async function DataWrapper() {
  const allNouns = await getAllNouns();
  const nounsInErc20Contract = allNouns.filter((noun) =>
    isAddressEqual(noun.owner, CHAIN_CONFIG.addresses.nounsErc20),
  );

  return (
    <DataMetric
      label="In Circulation"
      value={nounsInErc20Contract.length * $NOUNS_PER_NOUN}
    />
  );
}
