"use server";
import { requireAuth, requireRole, requireCompanyOwnership } from "@/lib/auth-guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth-guard";
import {
  EventNotFoundError,
  EventCannotBeDeletedError,
  EventAlreadyFinishedError,
  InvalidEventDatesError,
} from "./events.errors";
import {
  createEvent,
  getEventById,
  getEventsByField,
  getAllEventsPaginated,
  updateEvent,
  deleteEvent,
  finishEvent,
} from "./events.service";
import { createEventSchema, updateEventSchema } from "./events.schema";
import { z } from "zod";
import {
  createEventInput,
  EventFilters,
  updateEventInput,
} from "./events.types";
import { revalidatePath } from "next/cache";
import { logAuditSafe } from "../audit-log/audit-log.service";

export async function getPublicEventsHandler(
  filters?: Omit<EventFilters, "status">,
) {
  return getEventsByField({ ...filters, status: ["ACTIVE", "FINISHED"] });
}

export async function getEventByIdHandler(eventId: number) {
  try {
    await requireAuth();
    const event = await getEventById(eventId);

    if (event.status === "DRAFT") {
      return { success: false, error: "evento no encontrado" };
    }

    return { success: true, data: event };
  } catch (err) {
    if (err instanceof EventNotFoundError || err instanceof UnauthenticatedError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
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

export async function adminsGetEventsPaginatedHandler(
  filters?: EventFilters,
  page: number = 1,
  pageSize: number = 20,
) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const resolvedCompanyId =
      (session.role === "SUPER_ADMIN"
        ? filters?.companyId
        : session.companyId) ?? undefined;

    const result = await getAllEventsPaginated(
      { ...filters, companyId: resolvedCompanyId },
      page,
      pageSize,
    );
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthenticatedError) {
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
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
    await requireCompanyOwnership(companyId);

    const parsed = createEventSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }

    const event = await createEvent(parsed.data, companyId);

    await logAuditSafe({
      userId: session.userId,
      action: "CREATE",
      entity: "EVENT",
      entityId: event.id,
      companyId,
      eventId: event.id,
    });

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
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const existingEvent = await getEventById(eventId);
    await requireCompanyOwnership(existingEvent.companyId);

    const parsed = updateEventSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }

    const updatedEvent = await updateEvent(eventId, parsed.data);

    await logAuditSafe({
      userId: session.userId,
      action: "UPDATE",
      entity: "EVENT",
      entityId: eventId,
      companyId: existingEvent.companyId,
      eventId,
    });

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

export async function finishEventHandler(eventId: number) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const existingEvent = await getEventById(eventId);
    await requireCompanyOwnership(existingEvent.companyId);

    const finished = await finishEvent(eventId);

    await logAuditSafe({
      userId: session.userId,
      action: "UPDATE",
      entity: "EVENT",
      entityId: eventId,
      companyId: existingEvent.companyId,
      eventId,
    });

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}`);
    return { success: true, data: finished };
  } catch (err) {
    if (
      err instanceof EventNotFoundError ||
      err instanceof EventAlreadyFinishedError ||
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
    const session = await requireRole(["SUPER_ADMIN"]);
    const deleted = await deleteEvent(eventId);

    await logAuditSafe({
      userId: session.userId,
      action: "DELETE",
      entity: "EVENT",
      entityId: eventId,
      companyId: deleted.companyId,
      eventId,
    });

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
