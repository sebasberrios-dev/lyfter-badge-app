import { EventRegistration, Prisma, Redemption } from "@prisma/client";
import z from "zod";
import { redeemBadgeSchema } from "./redemptions.schema";

export type RedemptionFilters = {
  userId?: number;
  badgeId?: number;
  eventId?: number;
  redeemAtFrom?: Date;
  redeemAtTo?: Date;
  flagged?: boolean;
};

export type RedemptionWithBadge = Prisma.RedemptionGetPayload<{
  include: { badge: { include: { event: true } } };
}>;

export type EventRegistrationWithEvent = Prisma.EventRegistrationGetPayload<{
  include: { event: true };
}>;

export type EventRegistrationWithUser = Prisma.EventRegistrationGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

export type EventParticipant = {
  userId: number;
  name: string;
  email: string;
  registeredAt: Date;
  eventXp: number;
  redeemedCount: number;
  totalBadges: number;
};

export type RedeemAtomicParams = {
  userId: number;
  badgeId: number;
  eventId: number;
  xpValue: number;
  isWelcomeBadge: boolean;
  flagged: boolean;
};

export type RedeemAtomicResult =
  | { alreadyRedeemed: true }
  | {
      alreadyRedeemed: false;
      redemption: Redemption;
      newTotalXp: number;
      newEventXp: number;
    };

export type redeemBadgeInput = z.infer<typeof redeemBadgeSchema>;

export interface IRedemptionRepository {
  findMany(filters: RedemptionFilters): Promise<RedemptionWithBadge[]>;
  create(data: Prisma.RedemptionUncheckedCreateInput): Promise<Redemption>;
  findRegistration(
    userId: number,
    eventId: number,
  ): Promise<EventRegistration | null>;
  findRegistrationsByUser(userId: number): Promise<EventRegistrationWithEvent[]>;
  findRegistrationsByEvent(eventId: number): Promise<EventRegistrationWithUser[]>;
  countRedeemedByEvent(eventId: number): Promise<Map<number, number>>;
  redeemAtomic(params: RedeemAtomicParams): Promise<RedeemAtomicResult>;
  countRedeemedInEvent(userId: number, eventId: number): Promise<number>;
}
