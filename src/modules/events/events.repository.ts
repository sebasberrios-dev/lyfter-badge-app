import { EventFilters, EventWithCompany, IEventRepository } from "./events.types";
import { Prisma, Event } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function buildEventWhere(filters: EventFilters): Prisma.EventWhereInput {
  return {
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
  };
}

export class EventRepository implements IEventRepository {
  async findById(id: number): Promise<Event | null> {
    return prisma.event.findUnique({ where: { id } });
  }

  async findMany(filters: EventFilters): Promise<EventWithCompany[]> {
    return prisma.event.findMany({
      where: buildEventWhere(filters),
      include: { company: { select: { name: true } } },
    });
  }

  async findManyPaginated(
    filters: EventFilters,
    page: number,
    pageSize: number,
  ): Promise<{ events: EventWithCompany[]; total: number }> {
    const where = buildEventWhere(filters);

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { company: { select: { name: true } } },
        orderBy: { startDate: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total };
  }

  async create(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
    return prisma.event.create({ data });
  }

  async update(
    id: number,
    data: Prisma.EventUncheckedUpdateInput,
  ): Promise<Event> {
    return prisma.event.update({ data, where: { id } });
  }

  async delete(id: number): Promise<Event> {
    return prisma.event.delete({ where: { id } });
  }
}
