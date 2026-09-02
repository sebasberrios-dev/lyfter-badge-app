"use server";
import {
  requireAuth,
  requireRole,
  requireCompanyOwnership,
  ForbiddenError,
  UnauthenticatedError,
} from "@/lib/auth-guard";
import {
  getMyRedemptions,
  getUserRegisteredEvents,
  getEventParticipants,
  getEventMetrics,
} from "./redemptions.service";
import { getEventById } from "../events/events.service";
import { EventNotFoundError } from "../events/events.errors";

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

export async function adminsGetEventParticipantsHandler(eventId: number) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
    const event = await getEventById(eventId);
    await requireCompanyOwnership(event.companyId);

    const data = await getEventParticipants(eventId);
    return { success: true, data };
  } catch (err) {
    if (
      err instanceof EventNotFoundError ||
      err instanceof ForbiddenError ||
      err instanceof UnauthenticatedError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function adminsGetEventMetricsHandler(eventId: number) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
    const event = await getEventById(eventId);
    await requireCompanyOwnership(event.companyId);

    const data = await getEventMetrics(eventId);
    return { success: true, data };
  } catch (err) {
    if (
      err instanceof EventNotFoundError ||
      err instanceof ForbiddenError ||
      err instanceof UnauthenticatedError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
