import { BadgeRarity, BadgeType } from "@prisma/client";
import { verifyQrToken } from "@/lib/qr-token";
import { isWithinEventRadius } from "@/lib/geolocation";
import { getBadgeById } from "../badges/badges.service";
import { getEventById } from "../events/events.service";
import { getLevelForXp, didLevelUp } from "../xp-levels/xp-levels.service";
import { LevelInfo } from "../xp-levels/xp-levels.types";
import { RedemptionRepository } from "./redemptions.repository";
import {
  BadgeDoesNotMatchEventError,
  EventAlreadyEndedError,
  EventNotStartedError,
  ExpiredTokenError,
  InvalidTokenError,
  UserNotRegisteredToEventError,
} from "./redemptions.errors";

const redemptionRepo = new RedemptionRepository();

export type GeoCoords = { lat: number; lon: number };

export type RedeemedBadgeSummary = {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  rarity: BadgeRarity;
  xpValue: number;
};

export type RedeemBadgeResult =
  | { alreadyRedeemed: true; badge: RedeemedBadgeSummary }
  | {
      alreadyRedeemed: false;
      badge: RedeemedBadgeSummary;
      xpAwarded: number;
      newTotalXp: number;
      newEventXp: number;
      flagged: boolean;
      level: LevelInfo;
      leveledUp: boolean;
    };

export async function redeemBadge(
  userId: number,
  token: string,
  geoCoords?: GeoCoords,
): Promise<RedeemBadgeResult> {
  const verification = await verifyQrToken(token);
  if (!verification.valid) {
    if (verification.reason === "expired") {
      throw new ExpiredTokenError();
    }
    throw new InvalidTokenError();
  }
  const { badgeId, eventId: tokenEventId } = verification.payload;

  const badge = await getBadgeById(badgeId);

  if (badge.eventId !== tokenEventId) {
    throw new BadgeDoesNotMatchEventError();
  }

  const event = await getEventById(badge.eventId);

  const now = new Date();
  if (now < event.startDate || event.status === "DRAFT") {
    throw new EventNotStartedError();
  }
  if (now > event.endDate || event.status === "FINISHED") {
    throw new EventAlreadyEndedError();
  }

  const isWelcomeBadge = badge.type === "WELCOME";

  if (!isWelcomeBadge) {
    const registration = await redemptionRepo.findRegistration(
      userId,
      event.id,
    );
    if (!registration) {
      throw new UserNotRegisteredToEventError();
    }
  }

  let flagged = false;
  if (
    event.modality !== "VIRTUAL" &&
    event.latitude != null &&
    event.longitude != null &&
    geoCoords
  ) {
    flagged = !isWithinEventRadius(
      geoCoords.lat,
      geoCoords.lon,
      event.latitude,
      event.longitude,
    );
  }

  const badgeSummary: RedeemedBadgeSummary = {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    type: badge.type,
    rarity: badge.rarity,
    xpValue: badge.xpValue,
  };

  const result = await redemptionRepo.redeemAtomic({
    userId,
    badgeId: badge.id,
    eventId: event.id,
    xpValue: badge.xpValue,
    isWelcomeBadge,
    flagged,
  });

  if (result.alreadyRedeemed) {
    return { alreadyRedeemed: true, badge: badgeSummary };
  }

  const xpBefore = result.newTotalXp - badge.xpValue;

  return {
    alreadyRedeemed: false,
    badge: badgeSummary,
    xpAwarded: badge.xpValue,
    newTotalXp: result.newTotalXp,
    newEventXp: result.newEventXp,
    flagged,
    level: getLevelForXp(result.newTotalXp),
    leveledUp: didLevelUp(xpBefore, result.newTotalXp),
  };
}
