"use server";
import { SECONDS_PER_DAY } from "@/utils/constants";
import { getCurrentAuctionNounId } from "@/data/auction/getCurrentAuctionNounId";
import { getAuctionById } from "@/data/auction/getAuctionById";
import { formatEther, formatUnits, zeroAddress } from "viem";
import { getEthPriceUsd } from "@/data/tokens/getEthPriceUsd";
import { unstable_cache } from "next/cache";
import { indexerQueryAll } from "./client";

// Wallet-to-wallet $nouns transfer volume (mints and burns excluded) over the last 30 days, in USD
async function getNounsErc20VolumeUsdUncached() {
  const since = new Date(
    Date.now() - 30 * SECONDS_PER_DAY * 1000,
  ).toISOString();
  const transfers = await indexerQueryAll<{ value: string }>(
    "allNounsErc20Transfers",
    "value",
    `filter: { blockTimestamp: { greaterThan: "${since}" }, from: { notEqualTo: "${zeroAddress}" }, to: { notEqualTo: "${zeroAddress}" } }`,
  );
  if (!transfers) {
    return 0;
  }

  const totalVolume = transfers.reduce(
    (acc, { value }) => acc + BigInt(value),
    BigInt(0),
  );

  const [currentNounId, ethPriceUsd] = await Promise.all([
    getCurrentAuctionNounId(),
    getEthPriceUsd(),
  ]);

  const prevAuctionNounId =
    Number(currentNounId) % 10 == 0
      ? Number(currentNounId) - 2
      : Number(currentNounId) - 1;
  const prevAuction = await getAuctionById(prevAuctionNounId.toString());
  const prevAuctionWinningBid = BigInt(prevAuction?.bids[0]?.amount ?? "0");

  return (
    (Number(formatUnits(totalVolume, 18)) / 1000000) * // # of Nouns equivalent
    Number(formatEther(prevAuctionWinningBid)) * // Price of Noun in ETH
    ethPriceUsd
  );
}

export const getNounsErc20VolumeUsd = unstable_cache(
  getNounsErc20VolumeUsdUncached,
  ["get-nouns-erc20-volume-usd"],
  {
    revalidate: SECONDS_PER_DAY,
  },
);
