"use server";
import { CHAIN_CONFIG } from "@/config";
import { Address, getAddress, isAddressEqual } from "viem";
import { indexerQueryAll } from "./client";

const MAINNET_BASE_BRIDGE_CONTRACT_ADDRESS: Address =
  "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";

const NOUNS_ERC20_PER_NOUN = BigInt(10) ** BigInt(24); // 1M $nouns, 18 decimals
const MIN_EFFECTIVE_BALANCE = NOUNS_ERC20_PER_NOUN / BigInt(10); // Only consider holders with >0.1 of a Noun

const EXCLUDED_ADDRESSES: Address[] = [
  MAINNET_BASE_BRIDGE_CONTRACT_ADDRESS, // Bridged $nouns, otherwise will double count these
  CHAIN_CONFIG.addresses.nounsErc20, // Nouns backing $nouns, otherwise will double count these
  CHAIN_CONFIG.addresses.nounsAuctionHouseProxy, // Noun on auction
];

// Accounts by "effective Nouns" held: Nouns plus $nouns, in $nouns units (1 Noun = 1e24)
export async function getAccountLeaderboard(): Promise<
  { address: string; effectiveNounsBalance: string }[]
> {
  const [nftHolders, erc20Holders] = await Promise.all([
    indexerQueryAll<{ holder: string; balance: string }>(
      "allNftHolders",
      "holder balance",
      `filter: { balance: { greaterThan: "0" } }`,
    ),
    indexerQueryAll<{ holder: string; balance: string }>(
      "allErc20Holders",
      "holder balance",
      `filter: { balance: { greaterThan: "0" } }`,
    ),
  ]);
  if (!nftHolders || !erc20Holders) {
    return [];
  }

  const balances = new Map<string, bigint>();
  for (const { holder, balance } of nftHolders) {
    balances.set(
      holder,
      (balances.get(holder) ?? BigInt(0)) +
        BigInt(balance) * NOUNS_ERC20_PER_NOUN,
    );
  }
  for (const { holder, balance } of erc20Holders) {
    balances.set(holder, (balances.get(holder) ?? BigInt(0)) + BigInt(balance));
  }

  return Array.from(balances.entries())
    .filter(
      ([address, balance]) =>
        balance > MIN_EFFECTIVE_BALANCE &&
        !EXCLUDED_ADDRESSES.some((excluded) =>
          isAddressEqual(getAddress(address), excluded),
        ),
    )
    .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0))
    .map(([address, balance]) => ({
      address,
      effectiveNounsBalance: balance.toString(),
    }));
}
