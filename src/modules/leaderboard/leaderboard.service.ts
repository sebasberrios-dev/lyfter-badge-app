import { getEventById } from "../events/events.service";
import { getLevelForXp } from "../xp-levels/xp-levels.service";
import { LeaderboardRepository } from "./leaderboard.repository";
import { EventLeaderboardEntry, GlobalLeaderboardEntry } from "./leaderboard.types";

const leaderboardRepo = new LeaderboardRepository();

export const DEFAULT_LEADERBOARD_LIMIT = 50;

export async function getGlobalLeaderboard(
  limit: number = DEFAULT_LEADERBOARD_LIMIT,
): Promise<GlobalLeaderboardEntry[]> {
  const users = await leaderboardRepo.findTopUsersByTotalXp(limit);

  return users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    name: user.name,
    totalXp: user.totalXp,
    level: getLevelForXp(user.totalXp),
  }));
}

export async function getEventLeaderboard(
  eventId: number,
  limit: number = DEFAULT_LEADERBOARD_LIMIT,
): Promise<EventLeaderboardEntry[]> {
  await getEventById(eventId);

  const registrations = await leaderboardRepo.findTopRegistrationsByEventXp(
    eventId,
    limit,
  );
  const userIds = registrations.map((r) => r.userId);

  const badgeTypes = await leaderboardRepo.findRedemptionBadgeTypesForUsersInEvent(
    eventId,
    userIds,
  );

  const countsByUser = new Map<
    number,
    { talksAttended: number; boothsVisited: number }
  >();
  for (const { userId, badgeType } of badgeTypes) {
    const counts = countsByUser.get(userId) ?? {
      talksAttended: 0,
      boothsVisited: 0,
    };
    if (badgeType === "TALK") counts.talksAttended++;
    if (badgeType === "BOOTH") counts.boothsVisited++;
    countsByUser.set(userId, counts);
  }

  return registrations.map((registration, index) => ({
    rank: index + 1,
    userId: registration.userId,
    name: registration.user.name,
    eventXp: registration.eventXp,
    talksAttended: countsByUser.get(registration.userId)?.talksAttended ?? 0,
    boothsVisited: countsByUser.get(registration.userId)?.boothsVisited ?? 0,
  }));
}
