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
export interface IEventRepository {
  findById(id: number): Promise<Event | null>;
  findMany(filters: EventFilters): Promise<Event[]>;
  create(data: Prisma.EventUncheckedCreateInput): Promise<Event>;
  update(id: number, data: updateEventInput): Promise<Event>;
  delete(id: number): Promise<Event>;
}

export type createEventInput = z.infer<typeof createEventSchema>;
export type updateEventInput = z.infer<typeof updateEventSchema>;
