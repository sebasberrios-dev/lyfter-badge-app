import { BadgeType } from "@prisma/client";
import { LevelInfo } from "../xp-levels/xp-levels.types";

export type GlobalLeaderboardEntry = {
  rank: number;
  userId: number;
  name: string;
  totalXp: number;
  level: LevelInfo;
};

export type EventLeaderboardEntry = {
  rank: number;
  userId: number;
  name: string;
  eventXp: number;
  talksAttended: number;
  boothsVisited: number;
};

export type TopUserByTotalXp = {
  id: number;
  name: string;
  totalXp: number;
};

export type TopRegistrationByEventXp = {
  userId: number;
  eventXp: number;
  user: { name: string };
};

export type RedemptionBadgeType = {
  userId: number;
  badgeType: BadgeType;
};

export type UserGlobalRank = {
  rank: number;
  totalXp: number;
  level: LevelInfo;
};

export interface ILeaderboardRepository {
  findTopUsersByTotalXp(limit: number): Promise<TopUserByTotalXp[]>;
  findTopRegistrationsByEventXp(
    eventId: number,
    limit: number,
  ): Promise<TopRegistrationByEventXp[]>;
  findRedemptionBadgeTypesForUsersInEvent(
    eventId: number,
    userIds: number[],
  ): Promise<RedemptionBadgeType[]>;
  countUsersWithHigherXp(totalXp: number): Promise<number>;
}
