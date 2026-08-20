import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "nombre completo obligatorio"),
    email: z
      .email("formato válido de email obligatorio")
      .min(1, "email obligatorio")
      .toLowerCase(),
    password: z
      .string()
      .min(8, "mínimo 8 caracteres")
      .regex(/[A-Z]/, "debe incluir una mayúscula")
      .regex(/[a-z]/, "debe incluir una minúscula")
      .regex(/[0-9]/, "debe incluir un número")
      .regex(/[^A-Za-z0-9]/, "debe incluir un carácter especial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .email("formato válido de email obligatorio")
    .min(1, "email obligatorio")
    .toLowerCase(),
  password: z.string().min(1, "contraseña obligatoria"),
});
