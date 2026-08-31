import { cn } from "@/lib/utils";
import type {
  EventLeaderboardEntry,
  GlobalLeaderboardEntry,
} from "@/modules/leaderboard/leaderboard.types";

type LeaderboardTableProps =
  | {
      variant: "global";
      entries: GlobalLeaderboardEntry[];
      currentUserId?: number;
    }
  | {
      variant: "event";
      entries: EventLeaderboardEntry[];
      currentUserId?: number;
    };

type Row = {
  userId: number;
  rank: number;
  name: string;
  primaryValue: number;
  talksAttended?: number;
  boothsVisited?: number;
};

function toRows(props: LeaderboardTableProps): Row[] {
  if (props.variant === "event") {
    return props.entries.map((entry) => ({
      userId: entry.userId,
      rank: entry.rank,
      name: entry.name,
      primaryValue: entry.eventXp,
      talksAttended: entry.talksAttended,
      boothsVisited: entry.boothsVisited,
    }));
  }

  return props.entries.map((entry) => ({
    userId: entry.userId,
    rank: entry.rank,
    name: entry.name,
    primaryValue: entry.totalXp,
  }));
}

export function LeaderboardTable(props: LeaderboardTableProps) {
  const { variant, currentUserId } = props;
  const rows = toRows(props);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay datos de ranking.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-10 px-3 py-2">#</th>
            <th className="px-3 py-2">Participante</th>
            <th className="px-3 py-2 text-right">XP</th>
            {variant === "event" && (
              <>
                <th className="px-3 py-2 text-right">Charlas</th>
                <th className="px-3 py-2 text-right">Stands</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.userId}
              className={cn(
                "border-t border-border",
                row.userId === currentUserId && "bg-primary/10",
              )}
            >
              <td className="px-3 py-2 font-medium text-muted-foreground">
                {row.rank}
              </td>
              <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
              <td className="px-3 py-2 text-right">{row.primaryValue}</td>
              {variant === "event" && (
                <>
                  <td className="px-3 py-2 text-right">{row.talksAttended}</td>
                  <td className="px-3 py-2 text-right">{row.boothsVisited}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
