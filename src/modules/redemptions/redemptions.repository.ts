import { prisma } from "@/lib/prisma";
import {
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
        flagged: filters.flagged,
        redeemAt: {
          gte: filters.redeemAtFrom,
          lte: filters.redeemAtTo,
        },
      },
      include: { badge: true },
    });
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
