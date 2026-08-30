"use server";
import { getGlobalLeaderboard, getEventLeaderboard } from "./leaderboard.service";
import { EventNotFoundError } from "../events/events.errors";

export async function getGlobalLeaderboardHandler(limit?: number) {
  try {
    const leaderboard = await getGlobalLeaderboard(limit);
    return { success: true, data: leaderboard };
  } catch (err) {
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
