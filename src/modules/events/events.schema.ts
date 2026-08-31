import { EventModality } from "@prisma/client";
import { z } from "zod";

const eventObjectSchema = z.object({
  name: z.string().min(1, "nombre del evento obligatorio"),
  description: z
    .string()
    .min(20, "descripción debe ser mínimo de 20 caracteres"),
  location: z.string().min(1, "ubicación obligatoria"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  country: z.string().min(1, "país obligatorio"),
  modality: z.enum(EventModality),
  startDate: z.date(),
  endDate: z.date(),
  prizeDescription: z.string().optional(),
});

export const createEventSchema = eventObjectSchema.refine(
  (data) => data.endDate > data.startDate,
  {
    error: "La fecha de finalización debe ser posterior a la de inicio",
    path: ["endDate"],
  },
);

export const updateEventSchema = eventObjectSchema.partial();
