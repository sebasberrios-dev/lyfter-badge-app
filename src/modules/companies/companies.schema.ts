import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "nombre de la empresa obligatorio"),
});

export const updateCompanySchema = createCompanySchema.partial();

export const assignAdminByEmailSchema = z.object({
  email: z.email("correo inválido"),
});
