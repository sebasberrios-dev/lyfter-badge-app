import { prisma } from "@/lib/prisma";
import {
  EventRegistrationWithEvent,
  EventRegistrationWithUser,
  IRedemptionRepository,
  RedeemAtomicParams,
  RedeemAtomicResult,
  RedemptionFilters,
  RedemptionWithBadge,
} from "./redemptions.types";
import { EventRegistration, Prisma, Redemption } from "@prisma/client";

export class RedemptionRepository implements IRedemptionRepository {
  async findMany(filters: RedemptionFilters): Promise<RedemptionWithBadge[]> {
    return prisma.redemption.findMany({
      where: {
        userId: filters.userId,
        badgeId: filters.badgeId,
        badge: filters.eventId ? { eventId: filters.eventId } : undefined,
        flagged: filters.flagged,
        redeemAt: {
          gte: filters.redeemAtFrom,
          lte: filters.redeemAtTo,
        },
      },
      include: { badge: { include: { event: true } } },
    });
  }

  async findRegistrationsByUser(
    userId: number,
  ): Promise<EventRegistrationWithEvent[]> {
    return prisma.eventRegistration.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { registeredAt: "desc" },
    });
  }

  async findRegistrationsByEvent(
    eventId: number,
  ): Promise<EventRegistrationWithUser[]> {
    return prisma.eventRegistration.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { registeredAt: "desc" },
    });
  }

  async countRedeemedByEvent(eventId: number): Promise<Map<number, number>> {
    const rows = await prisma.redemption.groupBy({
      by: ["userId"],
      where: { badge: { eventId } },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.userId, row._count._all]));
  }

  async create(
    data: Prisma.RedemptionUncheckedCreateInput,
  ): Promise<Redemption> {
    return prisma.redemption.create({ data });
  }

  async findRegistration(
    userId: number,
    eventId: number,
  ): Promise<EventRegistration | null> {
    return prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
  }

  async countRedeemedInEvent(userId: number, eventId: number): Promise<number> {
    return prisma.redemption.count({
      where: { userId, badge: { eventId } },
    });
  }

  async redeemAtomic(params: RedeemAtomicParams): Promise<RedeemAtomicResult> {
    const { userId, badgeId, eventId, xpValue, isWelcomeBadge, flagged } =
      params;

    try {
      return await prisma.$transaction(async (tx) => {
        const redemption = await tx.redemption.create({
          data: { userId, badgeId, flagged },
        });

        const registration = isWelcomeBadge
          ? await tx.eventRegistration.create({
              data: { userId, eventId, eventXp: xpValue },
            })
          : await tx.eventRegistration.update({
              where: { userId_eventId: { userId, eventId } },
              data: { eventXp: { increment: xpValue } },
            });

        const user = await tx.user.update({
          where: { id: userId },
          data: { totalXp: { increment: xpValue } },
        });

        return {
          alreadyRedeemed: false as const,
          redemption,
          newTotalXp: user.totalXp,
          newEventXp: registration.eventXp,
        };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { alreadyRedeemed: true };
      }
      throw err;
    }
  }
}
