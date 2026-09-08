"use server";
import {
  ForbiddenError,
  requireRole,
  UnauthenticatedError,
} from "@/lib/auth-guard";
import { UserFilters } from "./users.types";
import { getAllUsers } from "./users.service";

export async function getAllUsersHandler(
  filters?: UserFilters,
  page: number = 1,
  pageSize: number = 20,
) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const result = await getAllUsers(filters ?? {}, page, pageSize);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }

    console.error(err);
    return { success: false, error: "error del servidor" };
  }
}
