import { prisma } from "@/lib/prisma";
import {
  ILeaderboardRepository,
  RedemptionBadgeType,
  TopRegistrationByEventXp,
  TopUserByTotalXp,
} from "./leaderboard.types";

export class LeaderboardRepository implements ILeaderboardRepository {
  async findTopUsersByTotalXp(limit: number): Promise<TopUserByTotalXp[]> {
    return prisma.user.findMany({
      orderBy: { totalXp: "desc" },
      take: limit,
      select: { id: true, name: true, totalXp: true },
    });
  }

  async findTopRegistrationsByEventXp(
    eventId: number,
    limit: number,
  ): Promise<TopRegistrationByEventXp[]> {
    return prisma.eventRegistration.findMany({
      where: { eventId },
      orderBy: { eventXp: "desc" },
      take: limit,
      select: {
        userId: true,
        eventXp: true,
        user: { select: { name: true } },
      },
    });
  }

  async findRedemptionBadgeTypesForUsersInEvent(
    eventId: number,
    userIds: number[],
  ): Promise<RedemptionBadgeType[]> {
    const redemptions = await prisma.redemption.findMany({
      where: { userId: { in: userIds }, badge: { eventId } },
      select: { userId: true, badge: { select: { type: true } } },
    });

    return redemptions.map((r) => ({ userId: r.userId, badgeType: r.badge.type }));
  }

  async countUsersWithHigherXp(totalXp: number): Promise<number> {
    return prisma.user.count({ where: { totalXp: { gt: totalXp } } });
  }
}
