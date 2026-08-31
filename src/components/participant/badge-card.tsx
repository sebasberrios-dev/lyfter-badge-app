import { Card, CardContent } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { BadgeIconGlyph } from "@/components/shared/badge-icon-glyph";
import { cn } from "@/lib/utils";
import { TYPE_LABELS, RARITY_LABELS } from "@/lib/badge-display";
import type { PublicBadgeSummary } from "@/modules/badges/badges.actions";

type BadgeCardProps = {
  badge: PublicBadgeSummary;
  redeemed?: boolean;
};

export function BadgeCard({ badge, redeemed = true }: BadgeCardProps) {
  return (
    <Card className={cn(!redeemed && "opacity-50")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <BadgeIconGlyph icon={badge.icon} rarity={badge.rarity} />
          <UiBadge variant="outline">+{badge.xpValue} XP</UiBadge>
        </div>
        <div>
          <p className="font-medium text-foreground">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{TYPE_LABELS[badge.type]}</span>
          <span aria-hidden>·</span>
          <span>{RARITY_LABELS[badge.rarity]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
