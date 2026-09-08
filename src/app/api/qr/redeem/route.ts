import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { redeemBadgeSchema } from "@/modules/redemptions/redemptions.schema";
import { redeemBadge } from "@/modules/redemptions/redemptions.service";
import {
  BadgeDoesNotMatchEventError,
  EventAlreadyEndedError,
  EventNotStartedError,
  ExpiredTokenError,
  InvalidTokenError,
  UserNotRegisteredToEventError,
} from "@/modules/redemptions/redemptions.errors";
import { BadgeNotFoundError } from "@/modules/badges/badges.errors";
import { EventNotFoundError } from "@/modules/events/events.errors";
import { requireAuth, UnauthenticatedError } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    const parsed = redeemBadgeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const result = await redeemBadge(
      session.userId,
      parsed.data.token,
      parsed.data.geoCoords,
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json(
        { error: err.message, code: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }
    if (err instanceof InvalidTokenError) {
      return NextResponse.json(
        { error: err.message, code: "TOKEN_INVALID" },
        { status: 400 },
      );
    }
    if (err instanceof ExpiredTokenError) {
      return NextResponse.json(
        { error: err.message, code: "TOKEN_EXPIRED" },
        { status: 410 },
      );
    }
    if (err instanceof BadgeDoesNotMatchEventError) {
      return NextResponse.json(
        { error: err.message, code: "BADGE_EVENT_MISMATCH" },
        { status: 400 },
      );
    }
    if (err instanceof EventNotStartedError) {
      return NextResponse.json(
        { error: err.message, code: "EVENT_NOT_STARTED" },
        { status: 409 },
      );
    }
    if (err instanceof EventAlreadyEndedError) {
      return NextResponse.json(
        { error: err.message, code: "EVENT_ALREADY_ENDED" },
        { status: 409 },
      );
    }
    if (err instanceof UserNotRegisteredToEventError) {
      return NextResponse.json(
        { error: err.message, code: "NOT_REGISTERED" },
        { status: 403 },
      );
    }
    if (err instanceof BadgeNotFoundError || err instanceof EventNotFoundError) {
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
