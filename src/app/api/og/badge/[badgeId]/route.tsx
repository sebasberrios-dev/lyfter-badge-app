import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getPublicBadge } from "@/modules/badges/badges.service";
import { BadgeNotFoundError } from "@/modules/badges/badges.errors";

// Copia hardcodeada de src/lib/badge-display.ts RARITY_STYLES: Satori no
// soporta clases de Tailwind ni variables CSS, así que va en hex directo.
// Mantener sincronizado si RARITY_STYLES cambia.
const RARITY_HEX: Record<string, string> = {
  COMMON: "#8a8f98",
  RARE: "#71ceff",
  LIMITED: "#d798e7",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ badgeId: string }> },
) {
  const { badgeId: badgeIdParam } = await params;
  const badgeId = Number(badgeIdParam);
  if (!Number.isInteger(badgeId)) {
    return new Response("Not found", { status: 404 });
  }

  let badge;
  try {
    badge = await getPublicBadge(badgeId);
  } catch (err) {
    if (err instanceof BadgeNotFoundError) {
      return new Response("Not found", { status: 404 });
    }
    throw err;
  }

  const iconUrl = new URL(`/icons/badges/${badge.icon}.svg`, req.url).toString();
  const accent = RARITY_HEX[badge.rarity] ?? RARITY_HEX.COMMON;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          background: "#282d37",
          color: "#f5f5f4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "160px",
            height: "160px",
            borderRadius: "9999px",
            background: accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconUrl}
            width={80}
            height={80}
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
        <div style={{ display: "flex", fontSize: "56px", fontWeight: 700 }}>
          {badge.name}
        </div>
        <div style={{ display: "flex", fontSize: "28px", color: "#a1a1aa" }}>
          {badge.eventName} · {badge.companyName}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            background: "#363c48",
            padding: "8px 20px",
            borderRadius: "9999px",
          }}
        >
          +{badge.xpValue} XP
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
