import {
  EventCannotBeDeletedError,
  EventNotFoundError,
  InvalidEventDatesError,
} from "./events.errors";
import { EventRepository } from "./events.repository";
import { Prisma } from "@prisma/client";
import {
  createEventInput,
  EventFilters,
  updateEventInput,
} from "./events.types";

const eventRepo = new EventRepository();

export async function getEventById(eventId: number) {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw new EventNotFoundError();
  }

  return event;
}

export async function getEventsByField(filters: EventFilters) {
  return eventRepo.findMany(filters);
}

export async function createEvent(data: createEventInput, companyId: number) {
  const parsedData = { ...data, companyId };
  const { startDate, endDate } = parsedData;

  if (startDate >= endDate) {
    throw new InvalidEventDatesError();
  }

  return eventRepo.create(parsedData);
}

export async function updateEvent(eventId: number, data: updateEventInput) {
  const exists = await eventRepo.findById(eventId);
  if (!exists) {
    throw new EventNotFoundError();
  }

  const startDate = data.startDate ?? exists.startDate;
  const endDate = data.endDate ?? exists.endDate;

  if (startDate >= endDate) {
    throw new InvalidEventDatesError();
  }

  return eventRepo.update(eventId, data);
}

export async function deleteEvent(eventId: number) {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw new EventNotFoundError();
  }
  try {
    return await eventRepo.delete(eventId);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2039"
    ) {
      throw new EventCannotBeDeletedError();
    }
    throw err;
  }
}
