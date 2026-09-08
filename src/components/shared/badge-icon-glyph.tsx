import type { BadgeRarity } from "@prisma/client";
import { cn } from "@/lib/utils";
import { RARITY_STYLES } from "@/lib/badge-display";

type BadgeIconGlyphProps = {
  icon: string;
  rarity: BadgeRarity;
  className?: string;
  iconClassName?: string;
};

export function BadgeIconGlyph({ icon, rarity, className, iconClassName }: BadgeIconGlyphProps) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        RARITY_STYLES[rarity],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("block size-6 bg-current", iconClassName)}
        style={{
          maskImage: `url(/icons/badges/${icon}.svg)`,
          WebkitMaskImage: `url(/icons/badges/${icon}.svg)`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    </span>
  );
}
