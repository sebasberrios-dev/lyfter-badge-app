import { EventRegistration, Prisma, Redemption } from "@prisma/client";

export type RedemptionFilters = {
  userId?: number;
  badgeId?: number;
  redeemAtFrom?: Date;
  redeemAtTo?: Date;
  flagged?: boolean;
};

export type RedemptionWithBadge = Prisma.RedemptionGetPayload<{
  include: { badge: true };
}>;

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

export interface IRedemptionRepository {
  findMany(filters: RedemptionFilters): Promise<RedemptionWithBadge[]>;
  create(data: Prisma.RedemptionUncheckedCreateInput): Promise<Redemption>;
  findRegistration(
    userId: number,
    eventId: number,
  ): Promise<EventRegistration | null>;
  redeemAtomic(params: RedeemAtomicParams): Promise<RedeemAtomicResult>;
}
