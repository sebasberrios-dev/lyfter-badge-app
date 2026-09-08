import type { BadgeType, BadgeRarity } from "@prisma/client";

export const TYPE_LABELS: Record<BadgeType, string> = {
  WELCOME: "Bienvenida",
  TALK: "Charla",
  BOOTH: "Stand",
  SPECIAL: "Especial",
};

export const RARITY_STYLES: Record<BadgeRarity, string> = {
  COMMON: "bg-muted text-muted-foreground",
  RARE: "bg-accent/15 text-accent",
  LIMITED:
    "bg-[color-mix(in_oklch,var(--color-lilac),transparent_80%)] text-[color:var(--color-lilac)]",
};

export const RARITY_LABELS: Record<BadgeRarity, string> = {
  COMMON: "Común",
  RARE: "Raro",
  LIMITED: "Edición limitada",
};
