import {
  EventFilters,
  IEventRepository,
  updateEventInput,
} from "./events.types";
import { Prisma, Event } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class EventRepository implements IEventRepository {
  async findById(id: number): Promise<Event | null> {
    return prisma.event.findUnique({ where: { id } });
  }

  async findMany(filters: EventFilters): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        name: filters.name
          ? { contains: filters.name, mode: "insensitive" }
          : undefined,
        location: filters.location
          ? { contains: filters.location, mode: "insensitive" }
          : undefined,
        country: filters.country,
        companyId: filters.companyId,
        modality: filters.modality,
        status: Array.isArray(filters.status)
          ? { in: filters.status }
          : filters.status,
        startDate: {
          gte: filters.startDateFrom,
          lte: filters.startDateTo,
        },
      },
    });
  }

  async create(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
    return prisma.event.create({ data });
  }

  async update(id: number, data: updateEventInput): Promise<Event> {
    return prisma.event.update({ data, where: { id } });
  }

  async delete(id: number): Promise<Event> {
    return prisma.event.delete({ where: { id } });
  }
}
