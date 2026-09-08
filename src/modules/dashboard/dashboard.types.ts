import { BadgeRarity, BadgeType } from "@prisma/client";

export type SnapshotRecord = {
  date: Date;
  attendeesCount: number;
  totalRedemptionsCount: number;
};

export type TrendDirection = "up" | "down" | null;

export type AttendeesTrend =
  | { available: false }
  | {
      available: true;
      percentChange: number;
      daysSinceSnapshot: number;
      label: string;
    };

export type TopRedeemedBadge = {
  id: number;
  name: string;
  type: BadgeType;
  rarity: BadgeRarity;
  count: number;
};

export type HourlyRedemptionBucket = {
  hour: number;
  count: number;
};

export type RecentRedemption = {
  userId: number;
  badgeId: number;
  userName: string;
  badgeName: string;
  redeemAt: Date;
};

export type ActiveEventBadgeCounts = {
  talks: number;
  booths: number;
};

export type DashboardMetrics = {
  attendeesCount: number;
  attendeesTrend: AttendeesTrend;
  totalRedemptionsCount: number;
  redemptionsPerAttendee: number;
  redemptionsTrend: TrendDirection;
  activeEventsCount: number;
  activeEventBadgeCounts: ActiveEventBadgeCounts;
  topRedeemedBadges: TopRedeemedBadge[];
  redemptionsByHour: HourlyRedemptionBucket[];
  recentRedemptions: RecentRedemption[];
};

export interface IDashboardRepository {
  findLatestSnapshotBefore(
    companyId: number | null,
    beforeDate: Date,
  ): Promise<SnapshotRecord | null>;
  upsertSnapshot(
    companyId: number | null,
    date: Date,
    attendeesCount: number,
    totalRedemptionsCount: number,
  ): Promise<void>;
  countDistinctAttendees(companyId: number | null): Promise<number>;
  countTotalRedemptions(companyId: number | null): Promise<number>;
  countActiveEvents(companyId: number | null): Promise<number>;
  countActiveEventBadgesByType(companyId: number | null): Promise<ActiveEventBadgeCounts>;
  findTopRedeemedBadges(
    companyId: number | null,
    limit: number,
  ): Promise<TopRedeemedBadge[]>;
  findRedemptionTimestamps(companyId: number | null): Promise<Date[]>;
  findRecentRedemptions(
    companyId: number | null,
    limit: number,
  ): Promise<RecentRedemption[]>;
}
