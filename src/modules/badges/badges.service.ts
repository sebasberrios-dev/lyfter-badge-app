import { Prisma } from "@prisma/client";
import {
  BadgeCannotBeDeletedError,
  BadgeNotFoundError,
  DuplicateWelcomeBadgeError,
} from "./badges.errors";
import { BadgeRepository } from "./badges.repository";
import {
  BadgeFilters,
  createBadgeInput,
  updateBadgeInput,
} from "./badges.types";
import generateQrToken from "@/lib/qrToken";

const badgeRepo = new BadgeRepository();

export async function getAllBadges() {
  return await badgeRepo.findMany({});
}

export async function getBadgeById(badgeId: number) {
  const badge = await badgeRepo.findById(badgeId);
  if (!badge) {
    throw new BadgeNotFoundError();
  }
  return badge;
}

export async function getBadgeByQrToken(qrToken: string) {
  const badge = await badgeRepo.findByQrToken(qrToken);
  if (!badge) {
    throw new BadgeNotFoundError();
  }

  return badge;
}

export async function getBadgesByField(filters: BadgeFilters) {
  return badgeRepo.findMany(filters);
}

export async function createBadge(eventId: number, data: createBadgeInput) {
  const qrToken = generateQrToken();
  const parsedData = { ...data, eventId, qrToken };

  if (parsedData.type === "WELCOME") {
    const existingWelcomeBadge = await badgeRepo.findMany({
      eventId,
      type: "WELCOME",
    });
    if (existingWelcomeBadge.length > 0) {
      throw new DuplicateWelcomeBadgeError();
    }
  }

  return badgeRepo.create(parsedData);
}

export async function updateBadge(badgeId: number, data: updateBadgeInput) {
  const existingBadge = await badgeRepo.findById(badgeId);
  if (!existingBadge) {
    throw new BadgeNotFoundError();
  }

  if (data.type === "WELCOME") {
    const eventId = existingBadge.eventId;
    const eventBadges = await badgeRepo.findMany({ eventId, type: "WELCOME" });
    const hasDuplicate = eventBadges.some((badge) => badge.id !== badgeId);

    if (hasDuplicate) {
      throw new DuplicateWelcomeBadgeError();
    }
  }

  return badgeRepo.update(badgeId, data);
}

export async function deleteBadge(badgeId: number) {
  const badge = await badgeRepo.findById(badgeId);
  if (!badge) {
    throw new BadgeNotFoundError();
  }

  try {
    return await badgeRepo.delete(badgeId);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2039"
    ) {
      throw new BadgeCannotBeDeletedError();
    }
    throw err;
  }
}
