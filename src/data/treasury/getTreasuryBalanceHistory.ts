"use server";
import { CHAIN_CONFIG } from "@/config";
import { Address, erc20Abi, formatUnits, parseAbi } from "viem";
import { getBlockNumber, multicall } from "viem/actions";
import { unstable_cache } from "next/cache";

// Treasury balance history read straight from the chain: one deployless multicall per sample block (archive
// eth_call), no indexer. Sample blocks sit on a fixed grid so each one is cached forever once read.

const DAO_START_BLOCK = BigInt(12985452);
const BLOCKS_PER_DAY = BigInt(7200);
const BLOCKS_PER_WEEK = BLOCKS_PER_DAY * BigInt(7);
const DAILY_HISTORY_BLOCKS = BLOCKS_PER_DAY * BigInt(183); // Daily for the last ~6 months, weekly before that
const CONCURRENCY = 20;

const EXECUTORS: Address[] = [
  "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71", // Executor
  "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10", // Executor (v1)
];
const MULTICALL_V1: Address = "0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441"; // Has getEthBalance, deployed before the DAO
const YEARN_LENS_ORACLE: Address = "0x83d95e0d5f402511db06817aff3f9ea88224b030"; // Prices in USDC (6 decimals)

const WETH: Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ETH_LIKE_TOKENS: Address[] = [
  WETH,
  "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH
  "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
  "0xae78736cd615f374d3085123a210448e74fc6393", // rETH
];
// Priced from Mantle's exchange rate: the lens is too expensive for mETH at old blocks and fails the whole read
const METH: Address = "0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa";
const MANTLE_STAKING: Address = "0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f";

const multicallV1Abi = parseAbi([
  "function getEthBalance(address) view returns (uint256)",
  "function getCurrentBlockTimestamp() view returns (uint256)",
]);
const lensOracleAbi = parseAbi([
  "function getPriceUsdcRecommended(address) view returns (uint256)",
]);
const mantleStakingAbi = parseAbi([
  "function mETHToETH(uint256) view returns (uint256)",
]);

export interface TreasuryBalancePoint {
  timestamp: number;
  balanceInUsd: number;
  ethPriceInUsd: number;
}

async function getTreasuryBalanceAtBlock(
  blockNumber: bigint,
): Promise<TreasuryBalancePoint> {
  const contracts = [
    {
      address: MULTICALL_V1,
      abi: multicallV1Abi,
      functionName: "getCurrentBlockTimestamp",
    },
    ...EXECUTORS.map((executor) => ({
      address: MULTICALL_V1,
      abi: multicallV1Abi,
      functionName: "getEthBalance",
      args: [executor],
    })),
    ...[...ETH_LIKE_TOKENS, USDC, METH].flatMap((token) =>
      EXECUTORS.map((executor) => ({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [executor],
      })),
    ),
    ...ETH_LIKE_TOKENS.map((token) => ({
      address: YEARN_LENS_ORACLE,
      abi: lensOracleAbi,
      functionName: "getPriceUsdcRecommended",
      args: [token],
    })),
    {
      address: MANTLE_STAKING,
      abi: mantleStakingAbi,
      functionName: "mETHToETH",
      args: [BigInt(1e18)],
    },
  ];

  // Deployless so it works at blocks before Multicall3 existed; a token that didn't exist yet just fails (balance 0)
  const results = await multicall(CHAIN_CONFIG.publicClient, {
    contracts: contracts as any,
    blockNumber,
    deployless: true,
    allowFailure: true,
  });
  const values = results.map((result) =>
    result.status == "success" ? (result.result as bigint) : BigInt(0),
  );

  if (results[0]?.status != "success") {
    throw new Error(`Treasury balance read failed at block ${blockNumber}`); // Don't cache a failed read
  }

  let i = 0;
  const timestamp = Number(values[i++]);
  const ethBalance = EXECUTORS.reduce((acc) => acc + values[i++], BigInt(0));
  const tokenBalances = [...ETH_LIKE_TOKENS, USDC, METH].map(() =>
    EXECUTORS.reduce((acc) => acc + values[i++], BigInt(0)),
  );
  const prices = ETH_LIKE_TOKENS.map(() => Number(formatUnits(values[i++], 6)));
  const methToEth = Number(formatUnits(values[i++], 18));

  const ethPriceInUsd = prices[0];
  const balanceInUsd =
    Number(formatUnits(ethBalance, 18)) * ethPriceInUsd +
    ETH_LIKE_TOKENS.reduce(
      (acc, _, j) =>
        acc + Number(formatUnits(tokenBalances[j], 18)) * prices[j],
      0,
    ) +
    Number(formatUnits(tokenBalances[ETH_LIKE_TOKENS.length], 6)) +
    Number(formatUnits(tokenBalances[ETH_LIKE_TOKENS.length + 1], 18)) *
      methToEth *
      ethPriceInUsd;

  return { timestamp, balanceInUsd, ethPriceInUsd };
}

// Past blocks never change, so cache them forever
const getTreasuryBalanceAtBlockCached = unstable_cache(
  async (blockNumber: string) => getTreasuryBalanceAtBlock(BigInt(blockNumber)),
  ["treasury-balance-at-block-v3"],
  { revalidate: false },
);

function sampleBlocks(latestBlock: bigint): bigint[] {
  const blocks: bigint[] = [];
  const dailyFrom = latestBlock - DAILY_HISTORY_BLOCKS;
  for (
    let block =
      (DAO_START_BLOCK / BLOCKS_PER_WEEK + BigInt(1)) * BLOCKS_PER_WEEK;
    block < dailyFrom;
    block += BLOCKS_PER_WEEK
  ) {
    blocks.push(block);
  }
  for (
    let block = (dailyFrom / BLOCKS_PER_DAY + BigInt(1)) * BLOCKS_PER_DAY;
    block < latestBlock;
    block += BLOCKS_PER_DAY
  ) {
    blocks.push(block);
  }
  return blocks;
}

// Weekly points since the DAO launched, daily for the last ~6 months, plus the latest block. Ordered oldest first.
export async function getTreasuryBalanceHistory(): Promise<
  TreasuryBalancePoint[]
> {
  const latestBlock = await getBlockNumber(CHAIN_CONFIG.publicClient);
  const blocks = sampleBlocks(latestBlock);

  const points: (TreasuryBalancePoint | undefined)[] = [];
  for (let i = 0; i < blocks.length; i += CONCURRENCY) {
    points.push(
      ...(await Promise.all(
        blocks.slice(i, i + CONCURRENCY).map((block) =>
          getTreasuryBalanceAtBlockCached(block.toString()).catch((e) => {
            console.error(e);
            return undefined; // Skip the point, the chart carries the previous one forward
          }),
        ),
      )),
    );
  }
  points.push(await getTreasuryBalanceAtBlock(latestBlock));

  return points.filter(
    (point): point is TreasuryBalancePoint => point != undefined,
  );
}
