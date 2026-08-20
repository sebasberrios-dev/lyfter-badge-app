"use server";
import { requireRole, requireCompanyOwnership } from "@/lib/auth-guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth-guard";
import {
  EventNotFoundError,
  EventCannotBeDeletedError,
  InvalidEventDatesError,
} from "./events.errors";
import {
  createEvent,
  getEventById,
  getEventsByField,
  updateEvent,
  deleteEvent,
} from "./events.service";
import { createEventSchema, updateEventSchema } from "./events.schema";
import { z } from "zod";
import {
  createEventInput,
  EventFilters,
  updateEventInput,
} from "./events.types";
import { revalidatePath } from "next/cache";

export async function getPublicEventsHandler(
  filters?: Omit<EventFilters, "status">,
) {
  return getEventsByField({ ...filters, status: ["ACTIVE", "FINISHED"] });
}

export async function adminsGetEventsHandler(
  eventId?: number,
  filters?: EventFilters,
) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const resolvedCompanyId =
      (session.role === "SUPER_ADMIN"
        ? filters?.companyId
        : session.companyId) ?? undefined;

    if (eventId) {
      const existingEvent = await getEventById(eventId);
      await requireCompanyOwnership(existingEvent.companyId);
      return { success: true, data: existingEvent };
    }

    const events = await getEventsByField({
      ...filters,
      companyId: resolvedCompanyId,
    });
    return { success: true, data: events };
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

export async function createEventHandler(
  data: createEventInput,
  companyId: number,
) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
    await requireCompanyOwnership(companyId);

    const parsed = createEventSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }

    const event = await createEvent(parsed.data, companyId);
    revalidatePath("/admin/events");
    return { success: true, data: event };
  } catch (err) {
    if (
      err instanceof InvalidEventDatesError ||
      err instanceof ForbiddenError ||
      err instanceof UnauthenticatedError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function updateEventHandler(
  eventId: number,
  data: updateEventInput,
) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const existingEvent = await getEventById(eventId);
    await requireCompanyOwnership(existingEvent.companyId);

    const parsed = updateEventSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }

    const updatedEvent = await updateEvent(eventId, parsed.data);
    revalidatePath("/admin/events");
    return { success: true, data: updatedEvent };
  } catch (err) {
    if (
      err instanceof InvalidEventDatesError ||
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

export async function deleteEventHandler(eventId: number) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const deleted = await deleteEvent(eventId);

    return { success: true, data: deleted };
  } catch (err) {
    if (
      err instanceof EventCannotBeDeletedError ||
      err instanceof ForbiddenError ||
      err instanceof UnauthenticatedError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
