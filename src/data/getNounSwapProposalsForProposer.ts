"use server";
import { ProposalState, SwapNounProposal } from "../utils/types";
import { Address } from "viem";
import { getNounById } from "./noun/getNounById";
import { CHAIN_CONFIG } from "../config";
import { LastKnownProposalState } from "./generated/ponder/graphql";
import { getBlockNumber } from "viem/actions";
import { fetchNounSwapProposals } from "./ponder/governance/getNounSwapProposals";

// Title format patterns for NounSwap proposals:
//   "NounSwap v1: Swap Noun X + Y WETH for Noun Z"
//   "NounSwap v1: Swap Noun X for Noun Y"
//   "NounSwap: Swap Noun X for Noun Y"
const TITLE_PATTERNS = [
  { regex: /NounSwap v1: Swap Noun [0-9]* \+ [0-9]*\.?[0-9]*? WETH for Noun [0-9]*/, fromIndex: 4, toIndex: 10 },
  { regex: /NounSwap v1: Swap Noun [0-9]* for Noun [0-9]*/, fromIndex: 4, toIndex: 7 },
  { regex: /NounSwap: Swap Noun [0-9]* for Noun [0-9]*/, fromIndex: 3, toIndex: 6 },
] as const;

function parseSwapNounIds(title: string): { fromNounId: string; toNounId: string } | undefined {
  for (const pattern of TITLE_PATTERNS) {
    const match = title.match(pattern.regex);
    if (match === null || match.length === 0) continue;

    const split = match[0].split(" ");
    return { fromNounId: split[pattern.fromIndex], toNounId: split[pattern.toIndex] };
  }
  return undefined;
}

function resolveProposalState(
  lastKnownState: LastKnownProposalState,
  currentBlock: bigint,
  votingStartBlock: number,
  votingEndBlock: number,
  forVotes: number,
  againstVotes: number,
  quorumVotes: number,
): ProposalState {
  switch (lastKnownState) {
    case LastKnownProposalState.Cancelled:
      return ProposalState.Cancelled;
    case LastKnownProposalState.Executed:
      return ProposalState.Executed;
    case LastKnownProposalState.Queued:
      return ProposalState.Queued;
    case LastKnownProposalState.Vetoed:
      return ProposalState.Vetoed;
    case LastKnownProposalState.Updatable:
    default: {
      const ended = currentBlock > BigInt(votingEndBlock);
      if (!ended) {
        const started = currentBlock > BigInt(votingStartBlock);
        return started ? ProposalState.Active : ProposalState.Pending;
      }
      const passing = forVotes >= quorumVotes && forVotes > againstVotes;
      return passing ? ProposalState.Succeeded : ProposalState.Defeated;
    }
  }
}

export async function getNounSwapProposalsForProposer(address: Address): Promise<SwapNounProposal[]> {
  const proposer = address.toString().toLowerCase();
  const currentBlock = await getBlockNumber(CHAIN_CONFIG.publicClient);

  const queryResult = await fetchNounSwapProposals(proposer);

  if (!queryResult) {
    console.log(`getNounSwapProposalsForProposer: no proposals found - ${address}`);
    return [];
  }

  const swapNounProposals: SwapNounProposal[] = [];

  for (const proposal of queryResult.proposals.items) {
    const parsed = parseSwapNounIds(proposal.title);
    if (!parsed) continue;

    const [fromNoun, toNoun] = await Promise.all([
      getNounById(parsed.fromNounId),
      getNounById(parsed.toNounId),
    ]);

    if (!fromNoun || !toNoun) continue;

    const state = resolveProposalState(
      proposal.lastKnownState,
      currentBlock,
      proposal.votingStartBlock,
      proposal.votingEndBlock,
      proposal.forVotes,
      proposal.againstVotes,
      proposal.quorumVotes,
    );

    swapNounProposals.push({
      id: proposal.id,
      fromNoun,
      toNoun,
      state,
    });
  }

  return swapNounProposals;
}
