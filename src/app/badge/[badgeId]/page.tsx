import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicBadge } from "@/modules/badges/badges.service";
import { BadgeNotFoundError } from "@/modules/badges/badges.errors";
import { BadgeIconGlyph } from "@/components/shared/badge-icon-glyph";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { TYPE_LABELS, RARITY_LABELS } from "@/lib/badge-display";

type PageProps = { params: Promise<{ badgeId: string }> };

async function loadBadge(badgeIdParam: string) {
  const badgeId = Number(badgeIdParam);
  if (!Number.isInteger(badgeId)) return null;
  try {
    return await getPublicBadge(badgeId);
  } catch (err) {
    if (err instanceof BadgeNotFoundError) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { badgeId } = await params;
  const badge = await loadBadge(badgeId);
  if (!badge) return { title: "Badge no encontrado" };

  const title = `${badge.name} · ${badge.eventName}`;
  const description = badge.description;
  const ogImage = `/api/og/badge/${badge.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicBadgePage({ params }: PageProps) {
  const { badgeId } = await params;
  const badge = await loadBadge(badgeId);
  if (!badge) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-4 py-8">
      <Logo />

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
        <BadgeIconGlyph
          icon={badge.icon}
          rarity={badge.rarity}
          className="size-20"
          iconClassName="size-10"
        />
        <div>
          <p className="text-xl font-bold text-foreground">{badge.name}</p>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{badge.eventName}</span>
          <span aria-hidden>·</span>
          <span>{badge.companyName}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <UiBadge variant="outline">+{badge.xpValue} XP</UiBadge>
          <UiBadge variant="outline">{TYPE_LABELS[badge.type]}</UiBadge>
          <UiBadge variant="outline">{RARITY_LABELS[badge.rarity]}</UiBadge>
        </div>
      </div>
    </div>
  );
}
