import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import z from "zod";
import { badgeQrTokenQuerySchema } from "@/modules/badges/badges.schema";
import { getBadgeByQrToken } from "@/modules/badges/badges.service";
import { BadgeNotFoundError } from "@/modules/badges/badges.errors";
import { signQrToken } from "@/lib/qr-token";

export async function GET(req: NextRequest) {
  try {
    const parsed = badgeQrTokenQuerySchema.safeParse({
      qrToken: req.nextUrl.searchParams.get("qrToken"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const badge = await getBadgeByQrToken(parsed.data.qrToken);

    const token = await signQrToken({
      badgeId: badge.id,
      eventId: badge.eventId,
    });
    const { exp } = decodeJwt(token);

    return NextResponse.json({
      token,
      expiresAt: new Date(exp! * 1000).toISOString(),
    });
  } catch (err) {
    if (err instanceof BadgeNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    console.error(err);
    return NextResponse.json(
      { error: "error del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
