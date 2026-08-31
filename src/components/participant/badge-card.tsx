import type { BadgeType, BadgeRarity } from "@prisma/client";
import { PartyPopper, Mic, Store, Star, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicBadgeSummary } from "@/modules/badges/badges.actions";

const TYPE_LABELS: Record<BadgeType, string> = {
  WELCOME: "Bienvenida",
  TALK: "Charla",
  BOOTH: "Stand",
  SPECIAL: "Especial",
};

const TYPE_ICONS: Record<BadgeType, LucideIcon> = {
  WELCOME: PartyPopper,
  TALK: Mic,
  BOOTH: Store,
  SPECIAL: Star,
};

const RARITY_STYLES: Record<BadgeRarity, string> = {
  COMMON: "bg-muted text-muted-foreground",
  RARE: "bg-accent/15 text-accent",
  LIMITED: "bg-[color-mix(in_oklch,var(--color-lilac),transparent_80%)] text-[color:var(--color-lilac)]",
};

const RARITY_LABELS: Record<BadgeRarity, string> = {
  COMMON: "Común",
  RARE: "Raro",
  LIMITED: "Edición limitada",
};

type BadgeCardProps = {
  badge: PublicBadgeSummary;
  redeemed?: boolean;
};

export function BadgeCard({ badge, redeemed = true }: BadgeCardProps) {
  const Icon = TYPE_ICONS[badge.type];

  return (
    <Card className={cn(!redeemed && "opacity-50")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              RARITY_STYLES[badge.rarity],
            )}
          >
            <Icon className="size-5" />
          </span>
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
