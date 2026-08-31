"use server";
import {
  getGlobalLeaderboard,
  getEventLeaderboard,
  getUserGlobalRank,
} from "./leaderboard.service";
import { EventNotFoundError } from "../events/events.errors";
import { UserNotFoundError } from "../users/users.errors";
import { requireAuth, UnauthenticatedError } from "@/lib/auth-guard";

export async function getGlobalLeaderboardHandler(limit?: number) {
  try {
    const leaderboard = await getGlobalLeaderboard(limit);
    return { success: true, data: leaderboard };
  } catch (err) {
    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getMyGlobalRankHandler() {
  try {
    const session = await requireAuth();
    const rank = await getUserGlobalRank(session.userId);
    return { success: true, data: rank };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof UserNotFoundError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getEventLeaderboardHandler(eventId: number, limit?: number) {
  try {
    const leaderboard = await getEventLeaderboard(eventId, limit);
    return { success: true, data: leaderboard };
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
