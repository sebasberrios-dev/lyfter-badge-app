import { Progress } from "@/components/ui/progress";
import type { LevelInfo } from "@/modules/xp-levels/xp-levels.types";

type XpProgressProps = {
  totalXp: number;
  level: LevelInfo;
};

export function XpProgress({ totalXp, level }: XpProgressProps) {
  const percent =
    level.nextLevelMinXp === null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((totalXp - level.minXp) / (level.nextLevelMinXp - level.minXp)) * 100,
          ),
        );

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">{level.name}</span>
        <span className="text-xs text-muted-foreground">
          {level.nextLevelMinXp === null
            ? `${totalXp} XP · nivel máximo`
            : `${totalXp} / ${level.nextLevelMinXp} XP`}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
