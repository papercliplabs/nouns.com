"use server";
import { SECONDS_PER_DAY } from "@/utils/constants";
import { Address, formatUnits, isAddressEqual } from "viem";
import { indexerQueryAll, toUnixSeconds } from "./client";
import {
  TreasuryBalancePoint,
  getTreasuryBalanceHistory,
} from "../treasury/getTreasuryBalanceHistory";

export interface DailyFinancialSnapshot {
  timestamp: number; // Start of the day (UTC), unix seconds

  treasuryBalanceInUsd: number;
  treasuryBalanceInEth: number;

  auctionRevenueInUsd: number;
  auctionRevenueInEth: number;

  propSpendInUsd: number;
  propSpendInEth: number;
}

// Matches what the old Ponder indexer counted as prop spend: ETH and USDC paid out by executed proposals, except
// ETH sent to the token buyer (it buys Nouns back), and except these proposals (staking ETH and the DAO migration)
const EXCLUDED_PROPOSAL_IDS = [
  "22",
  "30",
  "52",
  "217",
  "227",
  "332",
  "356",
  "359",
];
const NOUNS_TOKEN_BUYER: Address = "0x4f2aCdc74f6941390d9b1804faBc3E780388cfe5";

type PaymentNode = { value: string; txHash: string; blockTimestamp: string };

const tokenAmount = (raw: string, decimals: number) =>
  Number(formatUnits(BigInt(raw), decimals));
const dayOf = (timestamp: number) =>
  Math.floor(timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;

// One entry per day since the DAO launched: the treasury balance (read from the chain weekly, daily for recent
// months, carried forward between reads) and that day's auction revenue and proposal spend (from the indexer).
export async function getDailyFinancialSnapshots(): Promise<
  DailyFinancialSnapshot[]
> {
  const [
    balances,
    auctions,
    executions,
    ethTransfers,
    usdcPayouts,
    registeredDebts,
  ] = await Promise.all([
    getTreasuryBalanceHistory(),
    indexerQueryAll<{ amount: string; endTime: string }>(
      "allAuctions",
      "amount endTime",
      `filter: { settledBlock: { greaterThan: "0" }, amount: { greaterThan: "0" } }`,
    ),
    indexerQueryAll<{ id: string; txHash: string }>(
      "allProposalExecuteds",
      "id txHash",
    ),
    indexerQueryAll<PaymentNode & { target: string }>(
      "allExecuteTransactions",
      "target value txHash blockTimestamp",
      `filter: { value: { notEqualTo: "0" } }`,
    ),
    indexerQueryAll<PaymentNode>(
      "allPayerUsdcTransfers",
      "value txHash blockTimestamp",
    ),
    indexerQueryAll<PaymentNode>(
      "allRegisteredDebts",
      "value: amount txHash blockTimestamp",
    ),
  ]);

  if (
    balances.length == 0 ||
    !auctions ||
    !executions ||
    !ethTransfers ||
    !usdcPayouts ||
    !registeredDebts
  ) {
    return [];
  }

  // Latest balance read per day
  const balanceByDay = new Map<number, TreasuryBalancePoint>();
  for (const balance of balances) {
    balanceByDay.set(dayOf(balance.timestamp), balance);
  }

  const revenueEthByDay = new Map<number, number>();
  const spendEthByDay = new Map<number, number>();
  const spendUsdByDay = new Map<number, number>();
  const addTo = (map: Map<number, number>, day: number, amount: number) =>
    map.set(day, (map.get(day) ?? 0) + amount);

  for (const auction of auctions) {
    addTo(
      revenueEthByDay,
      dayOf(Number(auction.endTime)),
      tokenAmount(auction.amount, 18),
    );
  }
  // Payments made while executing a counted proposal. USDC debt paid back later happens outside of these, so it
  // isn't counted twice: the debt was already counted when it was registered.
  const spendTxHashes = new Set(
    executions
      .filter(({ id }) => !EXCLUDED_PROPOSAL_IDS.includes(id))
      .map(({ txHash }) => txHash),
  );
  const isSpend = (payment: PaymentNode) => spendTxHashes.has(payment.txHash);

  for (const transfer of ethTransfers) {
    if (
      isSpend(transfer) &&
      !isAddressEqual(transfer.target as Address, NOUNS_TOKEN_BUYER)
    ) {
      addTo(
        spendEthByDay,
        dayOf(toUnixSeconds(transfer.blockTimestamp)),
        tokenAmount(transfer.value, 18),
      );
    }
  }
  for (const payment of [...usdcPayouts, ...registeredDebts]) {
    if (isSpend(payment)) {
      addTo(
        spendUsdByDay,
        dayOf(toUnixSeconds(payment.blockTimestamp)),
        tokenAmount(payment.value, 6),
      );
    }
  }

  const firstDay = Math.min(
    dayOf(balances[0].timestamp),
    ...Array.from(revenueEthByDay.keys()),
    ...Array.from(spendEthByDay.keys()),
    ...Array.from(spendUsdByDay.keys()),
  );
  const lastDay = dayOf(Math.floor(Date.now() / 1000));

  let latestBalance = balances[0];
  let ethPriceUsd = latestBalance.ethPriceInUsd;

  const days: DailyFinancialSnapshot[] = [];
  for (let day = firstDay; day <= lastDay; day += SECONDS_PER_DAY) {
    const balance = balanceByDay.get(day);
    if (balance) {
      latestBalance = balance;
      ethPriceUsd = balance.ethPriceInUsd || ethPriceUsd;
    }

    const treasuryBalanceInUsd = latestBalance.balanceInUsd;
    const auctionRevenueInEth = revenueEthByDay.get(day) ?? 0;
    const propSpendInEth =
      (spendEthByDay.get(day) ?? 0) +
      (spendUsdByDay.get(day) ?? 0) / ethPriceUsd;

    days.push({
      timestamp: day,

      treasuryBalanceInUsd,
      treasuryBalanceInEth: treasuryBalanceInUsd / ethPriceUsd,

      auctionRevenueInUsd: auctionRevenueInEth * ethPriceUsd,
      auctionRevenueInEth,

      propSpendInUsd: propSpendInEth * ethPriceUsd,
      propSpendInEth,
    });
  }

  return days;
}
