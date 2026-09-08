import { DashboardRepository } from "./dashboard.repository";
import {
  AttendeesTrend,
  DashboardMetrics,
  HourlyRedemptionBucket,
  TrendDirection,
} from "./dashboard.types";

const dashboardRepo = new DashboardRepository();

const MS_PER_DAY = 86_400_000;
const TOP_BADGES_LIMIT = 5;
const RECENT_REDEMPTIONS_LIMIT = 8;

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function recordSnapshotSafe(
  companyId: number | null,
  today: Date,
  attendeesCount: number,
  totalRedemptionsCount: number,
): Promise<void> {
  try {
    await dashboardRepo.upsertSnapshot(companyId, today, attendeesCount, totalRedemptionsCount);
  } catch (err) {
    console.error("no se pudo escribir el snapshot del dashboard:", err);
  }
}

export async function computeAttendeesTrend(
  companyId: number | null,
  today: Date,
  currentCount: number,
): Promise<AttendeesTrend> {
  const previous = await dashboardRepo.findLatestSnapshotBefore(companyId, today);
  if (!previous || previous.attendeesCount === 0) return { available: false };

  const daysSinceSnapshot = Math.round(
    (today.getTime() - startOfUtcDay(previous.date).getTime()) / MS_PER_DAY,
  );
  const percentChange = Math.round(
    ((currentCount - previous.attendeesCount) / previous.attendeesCount) * 100,
  );
  const label = daysSinceSnapshot <= 1 ? "vs. ayer" : `vs. hace ${daysSinceSnapshot} días`;

  return { available: true, percentChange, daysSinceSnapshot, label };
}

export async function computeRedemptionsTrend(
  companyId: number | null,
  today: Date,
  currentRedemptionsPerAttendee: number,
): Promise<TrendDirection> {
  const previous = await dashboardRepo.findLatestSnapshotBefore(companyId, today);
  if (!previous || previous.attendeesCount === 0) return null;

  const previousRatio = previous.totalRedemptionsCount / previous.attendeesCount;
  if (currentRedemptionsPerAttendee > previousRatio) return "up";
  if (currentRedemptionsPerAttendee < previousRatio) return "down";
  return null;
}

function buildHourlyBuckets(timestamps: Date[]): HourlyRedemptionBucket[] {
  const counts = new Array(24).fill(0);
  for (const ts of timestamps) counts[ts.getHours()]++;
  return counts.map((count, hour) => ({ hour, count }));
}

export async function getDashboardMetrics(
  companyId: number | null,
): Promise<DashboardMetrics> {
  const today = startOfUtcDay(new Date());

  const [
    attendeesCount,
    totalRedemptionsCount,
    activeEventsCount,
    activeEventBadgeCounts,
    topRedeemedBadges,
    redemptionTimestamps,
    recentRedemptions,
  ] = await Promise.all([
    dashboardRepo.countDistinctAttendees(companyId),
    dashboardRepo.countTotalRedemptions(companyId),
    dashboardRepo.countActiveEvents(companyId),
    dashboardRepo.countActiveEventBadgesByType(companyId),
    dashboardRepo.findTopRedeemedBadges(companyId, TOP_BADGES_LIMIT),
    dashboardRepo.findRedemptionTimestamps(companyId),
    dashboardRepo.findRecentRedemptions(companyId, RECENT_REDEMPTIONS_LIMIT),
  ]);

  const redemptionsPerAttendee =
    attendeesCount === 0
      ? 0
      : Math.round((totalRedemptionsCount / attendeesCount) * 10) / 10;

  const attendeesTrend = await computeAttendeesTrend(companyId, today, attendeesCount);
  const redemptionsTrend = await computeRedemptionsTrend(
    companyId,
    today,
    redemptionsPerAttendee,
  );
  await recordSnapshotSafe(companyId, today, attendeesCount, totalRedemptionsCount);

  return {
    attendeesCount,
    attendeesTrend,
    totalRedemptionsCount,
    redemptionsPerAttendee,
    redemptionsTrend,
    activeEventsCount,
    activeEventBadgeCounts,
    topRedeemedBadges,
    redemptionsByHour: buildHourlyBuckets(redemptionTimestamps),
    recentRedemptions,
  };
}
