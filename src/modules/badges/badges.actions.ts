"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getAllBadges,
  getBadgeById,
  getBadgeByField,
  createBadge,
  updateBadge,
  deleteBadge,
} from "./badges.service";
import {
  UnauthenticatedError,
  ForbiddenError,
  requireRole,
  requireCompanyOwnership,
} from "@/lib/auth-guard";
import {
  BadgeCannotBeDeletedError,
  BadgeNotFoundError,
  DuplicateWelcomeBadgeError,
} from "./badges.errors";
import {
  BadgeFilters,
  createBadgeInput,
  updateBadgeInput,
} from "./badges.types";
import { createBadgeSchema, updateBadgeSchema } from "./badges.schema";
import { getEventById } from "../events/events.service";
import { EventNotFoundError } from "../events/events.errors";

export async function getAllBadgesHandler() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const badges = await getAllBadges();
    return { success: true, data: badges };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getBadgeByIdHandler(badgeId: number) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
    const badge = await getBadgeById(badgeId);

    await requireCompanyOwnership(badge.event.companyId);

    return { success: true, data: badge };
  } catch (err) {
    if (
      err instanceof UnauthenticatedError ||
      err instanceof ForbiddenError ||
      err instanceof BadgeNotFoundError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function getBadgeByFieldHandler(filters?: BadgeFilters) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const resolvedCompanyId =
      (session.role === "SUPER_ADMIN"
        ? filters?.companyId
        : session.companyId) ?? undefined;

    const badges = await getBadgeByField({
      ...filters,
      companyId: resolvedCompanyId,
    });
    return { success: true, data: badges };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function createBadgeHandler(
  eventId: number,
  data: createBadgeInput,
) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const event = await getEventById(eventId);
    await requireCompanyOwnership(event.companyId);

    const parsed = createBadgeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }

    const badge = await createBadge(eventId, parsed.data);
    revalidatePath("/admin/events");
    return { success: true, data: badge };
  } catch (err) {
    if (
      err instanceof DuplicateWelcomeBadgeError ||
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

export async function updateBadgeHandler(
  badgeId: number,
  data: updateBadgeInput,
) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const existingBadge = await getBadgeById(badgeId);
    await requireCompanyOwnership(existingBadge.event.companyId);

    const parsed = updateBadgeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.treeifyError(parsed.error) };
    }

    const updatedBadge = await updateBadge(badgeId, parsed.data);
    revalidatePath("/admin/events");
    return { success: true, data: updatedBadge };
  } catch (err) {
    if (
      err instanceof DuplicateWelcomeBadgeError ||
      err instanceof BadgeNotFoundError ||
      err instanceof ForbiddenError ||
      err instanceof UnauthenticatedError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}

export async function deleteBadgeHandler(badgeId: number) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const existingBadge = await getBadgeById(badgeId);
    await requireCompanyOwnership(existingBadge.event.companyId);

    const deleted = await deleteBadge(badgeId);
    revalidatePath("/admin/events");
    return { success: true, data: deleted };
  } catch (err) {
    if (
      err instanceof BadgeCannotBeDeletedError ||
      err instanceof BadgeNotFoundError ||
      err instanceof ForbiddenError ||
      err instanceof UnauthenticatedError
    ) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
