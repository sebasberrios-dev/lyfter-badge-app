import { z } from "zod";

export const redeemBadgeSchema = z.object({
  token: z.string().min(1, "token requerido"),
  geoCoords: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    })
    .optional(),
});
