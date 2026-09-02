import { Event, EventModality, EventStatus, Prisma } from "@prisma/client";
import { createEventSchema, updateEventSchema } from "./events.schema";
import { z } from "zod";

export type EventFilters = {
  name?: string;
  location?: string;
  country?: string;
  companyId?: number;
  modality?: EventModality;
  status?: EventStatus | EventStatus[];
  startDateFrom?: Date;
  startDateTo?: Date;
};

export type EventWithCompany = Prisma.EventGetPayload<{
  include: { company: { select: { name: true } } };
}>;

export interface IEventRepository {
  findById(id: number): Promise<Event | null>;
  findMany(filters: EventFilters): Promise<EventWithCompany[]>;
  findManyPaginated(
    filters: EventFilters,
    page: number,
    pageSize: number,
  ): Promise<{ events: EventWithCompany[]; total: number }>;
  create(data: Prisma.EventUncheckedCreateInput): Promise<Event>;
  update(id: number, data: Prisma.EventUncheckedUpdateInput): Promise<Event>;
  delete(id: number): Promise<Event>;
}

export type createEventInput = z.infer<typeof createEventSchema>;
export type updateEventInput = z.infer<typeof updateEventSchema>;
