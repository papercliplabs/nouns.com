import TitlePopover from "@/components/TitlePopover";
import Card from "@/components/ui/card";
import { getAccountLeaderboard } from "@/data/indexer/getAccountLeaderboard";
import { formatNumber } from "@/utils/format";
import { formatUnits, getAddress } from "viem";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeaderboardStatsRow } from "./LeaderboardStatsRow";

interface LeaderboardStatsProps {
  accountLeaderboardData: Awaited<ReturnType<typeof getAccountLeaderboard>>;
  totalNounsCount: number;
}

export default function LeaderboardStats({
  accountLeaderboardData,
  totalNounsCount,
}: LeaderboardStatsProps) {
  const uniqueOwnerCount = accountLeaderboardData.length;
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex flex-col">
          <TitlePopover title="Total Nouns">
            Total number of Nouns currently in existence
          </TitlePopover>
          <span className="label-lg">
            {formatNumber({ input: totalNounsCount, maxFractionDigits: 0 })}
          </span>
        </Card>
        <Card className="flex flex-col">
          <TitlePopover title="Unique Owners">
            Total number of unique owners. An owner is considered to be an
            account with an ownership above 0.1 Nouns.
          </TitlePopover>
          <span className="label-lg">{uniqueOwnerCount}</span>
        </Card>
      </div>
      <Table className="w-full table-fixed overflow-hidden">
        <TableHeader>
          <TableRow className="hover:bg-white">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>
              Owners{" "}
              <span className="text-content-secondary">
                ({uniqueOwnerCount})
              </span>
            </TableHead>
            <TableHead className="w-[130px] text-right">Ownership</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accountLeaderboardData.map((entry, i) => {
            const ownershipCount = Number(
              formatUnits(BigInt(entry.effectiveNounsBalance), 24),
            );
            const percentOwnership = ownershipCount / totalNounsCount;
            const address = getAddress(entry.address);
            return (
              <LeaderboardStatsRow
                key={entry.address}
                address={address}
                ownershipCount={ownershipCount}
                percentOwnership={percentOwnership}
                position={i + 1}
              />
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
