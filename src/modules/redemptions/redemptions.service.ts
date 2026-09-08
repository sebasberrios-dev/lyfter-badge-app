import { BadgeRarity, BadgeType } from "@prisma/client";
import { verifyQrToken } from "@/lib/qr-token";
import { isWithinEventRadius } from "@/lib/geolocation";
import { getBadgeById, getBadgesByField } from "../badges/badges.service";
import { getEventById } from "../events/events.service";
import { getLevelForXp, didLevelUp } from "../xp-levels/xp-levels.service";
import { LevelInfo } from "../xp-levels/xp-levels.types";
import { RedemptionRepository } from "./redemptions.repository";
import { EventParticipant } from "./redemptions.types";
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
      eventCompleted: boolean;
      prizeDescription: string | null;
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

  const totalBadges = await getBadgesByField({ eventId: event.id });
  const redeemedCount = await redemptionRepo.countRedeemedInEvent(
    userId,
    event.id,
  );
  const eventCompleted =
    totalBadges.length > 0 && redeemedCount === totalBadges.length;

  return {
    alreadyRedeemed: false,
    badge: badgeSummary,
    xpAwarded: badge.xpValue,
    newTotalXp: result.newTotalXp,
    newEventXp: result.newEventXp,
    flagged,
    level: getLevelForXp(result.newTotalXp),
    leveledUp: didLevelUp(xpBefore, result.newTotalXp),
    eventCompleted,
    prizeDescription: eventCompleted ? event.prizeDescription : null,
  };
}

export async function getMyRedemptions(userId: number) {
  return redemptionRepo.findMany({ userId });
}

export async function getUserRegisteredEvents(userId: number) {
  return redemptionRepo.findRegistrationsByUser(userId);
}

export async function getEventParticipants(
  eventId: number,
): Promise<EventParticipant[]> {
  const [registrations, redeemedCounts, totalBadges] = await Promise.all([
    redemptionRepo.findRegistrationsByEvent(eventId),
    redemptionRepo.countRedeemedByEvent(eventId),
    getBadgesByField({ eventId }),
  ]);

  return registrations.map((registration) => ({
    userId: registration.user.id,
    name: registration.user.name,
    email: registration.user.email,
    registeredAt: registration.registeredAt,
    eventXp: registration.eventXp,
    redeemedCount: redeemedCounts.get(registration.user.id) ?? 0,
    totalBadges: totalBadges.length,
  }));
}

export type EventMetrics = {
  participantsCount: number;
  avgCompletionPct: number;
  flaggedRedemptionsCount: number;
  badgesRedeemedByType: {
    id: number;
    name: string;
    type: BadgeType;
    rarity: BadgeRarity;
    count: number;
  }[];
};

export async function getEventMetrics(eventId: number): Promise<EventMetrics> {
  const [participants, totalBadges, eventRedemptions] = await Promise.all([
    getEventParticipants(eventId),
    getBadgesByField({ eventId }),
    redemptionRepo.findMany({ eventId }),
  ]);

  const participantsCount = participants.length;
  const avgCompletionPct =
    totalBadges.length === 0 || participantsCount === 0
      ? 0
      : Math.round(
          (participants.reduce((sum, p) => sum + p.redeemedCount, 0) /
            (participantsCount * totalBadges.length)) *
            100,
        );

  const flaggedRedemptionsCount = eventRedemptions.filter(
    (redemption) => redemption.flagged,
  ).length;

  const countsByBadge = new Map<number, number>();
  for (const redemption of eventRedemptions) {
    countsByBadge.set(
      redemption.badgeId,
      (countsByBadge.get(redemption.badgeId) ?? 0) + 1,
    );
  }

  const badgesRedeemedByType = totalBadges
    .map((badge) => ({
      id: badge.id,
      name: badge.name,
      type: badge.type,
      rarity: badge.rarity,
      count: countsByBadge.get(badge.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    participantsCount,
    avgCompletionPct,
    flaggedRedemptionsCount,
    badgesRedeemedByType,
  };
}
