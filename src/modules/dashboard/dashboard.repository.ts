import { prisma } from "@/lib/prisma";
import {
  ActiveEventBadgeCounts,
  IDashboardRepository,
  RecentRedemption,
  SnapshotRecord,
  TopRedeemedBadge,
} from "./dashboard.types";

export class DashboardRepository implements IDashboardRepository {
  async findLatestSnapshotBefore(
    companyId: number | null,
    beforeDate: Date,
  ): Promise<SnapshotRecord | null> {
    return prisma.dashboardSnapshot.findFirst({
      where: { companyId, date: { lt: beforeDate } },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: { date: true, attendeesCount: true, totalRedemptionsCount: true },
    });
  }

  async upsertSnapshot(
    companyId: number | null,
    date: Date,
    attendeesCount: number,
    totalRedemptionsCount: number,
  ): Promise<void> {
    const existing = await prisma.dashboardSnapshot.findFirst({
      where: { companyId, date },
      orderBy: { id: "desc" },
    });

    if (existing) {
      await prisma.dashboardSnapshot.update({
        where: { id: existing.id },
        data: { attendeesCount, totalRedemptionsCount },
      });
    } else {
      await prisma.dashboardSnapshot.create({
        data: { companyId, date, attendeesCount, totalRedemptionsCount },
      });
    }
  }

  async countDistinctAttendees(companyId: number | null): Promise<number> {
    const rows = await prisma.eventRegistration.groupBy({
      by: ["userId"],
      where: companyId != null ? { event: { companyId } } : undefined,
    });
    return rows.length;
  }

  async countTotalRedemptions(companyId: number | null): Promise<number> {
    return prisma.redemption.count({
      where: companyId != null ? { badge: { event: { companyId } } } : undefined,
    });
  }

  async countActiveEvents(companyId: number | null): Promise<number> {
    return prisma.event.count({
      where: { status: "ACTIVE", companyId: companyId ?? undefined },
    });
  }

  async countActiveEventBadgesByType(
    companyId: number | null,
  ): Promise<ActiveEventBadgeCounts> {
    const [talks, booths] = await Promise.all([
      prisma.badge.count({
        where: { type: "TALK", event: { status: "ACTIVE", companyId: companyId ?? undefined } },
      }),
      prisma.badge.count({
        where: { type: "BOOTH", event: { status: "ACTIVE", companyId: companyId ?? undefined } },
      }),
    ]);
    return { talks, booths };
  }

  async findTopRedeemedBadges(
    companyId: number | null,
    limit: number,
  ): Promise<TopRedeemedBadge[]> {
    const grouped = await prisma.redemption.groupBy({
      by: ["badgeId"],
      where: companyId != null ? { badge: { event: { companyId } } } : undefined,
      _count: { _all: true },
      orderBy: { _count: { badgeId: "desc" } },
      take: limit,
    });
    if (grouped.length === 0) return [];

    const badges = await prisma.badge.findMany({
      where: { id: { in: grouped.map((g) => g.badgeId) } },
    });
    const badgeById = new Map(badges.map((b) => [b.id, b]));

    return grouped
      .map((g) => {
        const badge = badgeById.get(g.badgeId);
        if (!badge) return null;
        return {
          id: badge.id,
          name: badge.name,
          type: badge.type,
          rarity: badge.rarity,
          count: g._count._all,
        };
      })
      .filter((x): x is TopRedeemedBadge => x !== null);
  }

  async findRedemptionTimestamps(companyId: number | null): Promise<Date[]> {
    const rows = await prisma.redemption.findMany({
      where: companyId != null ? { badge: { event: { companyId } } } : undefined,
      select: { redeemAt: true },
    });
    return rows.map((r) => r.redeemAt);
  }

  async findRecentRedemptions(
    companyId: number | null,
    limit: number,
  ): Promise<RecentRedemption[]> {
    const rows = await prisma.redemption.findMany({
      where: companyId != null ? { badge: { event: { companyId } } } : undefined,
      orderBy: { redeemAt: "desc" },
      take: limit,
      include: {
        user: { select: { name: true } },
        badge: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      userId: r.userId,
      badgeId: r.badgeId,
      userName: r.user.name,
      badgeName: r.badge.name,
      redeemAt: r.redeemAt,
    }));
  }
}
