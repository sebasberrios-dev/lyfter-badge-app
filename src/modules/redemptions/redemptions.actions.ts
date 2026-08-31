"use server";
import { requireAuth, UnauthenticatedError } from "@/lib/auth-guard";
import { getMyRedemptions, getUserRegisteredEvents } from "./redemptions.service";

export async function getMyRedemptionsHandler() {
  try {
    const session = await requireAuth();
    const data = await getMyRedemptions(session.userId);
    return { success: true, data };
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getMyRegisteredEventsHandler() {
  try {
    const session = await requireAuth();
    const data = await getUserRegisteredEvents(session.userId);
    return { success: true, data };
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
