"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User } from "lucide-react";
import type { z } from "zod";
import { registerSchema } from "@/modules/users/users.schema";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

type RegisterInput = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json();

    if (res.ok) {
      router.push("/home");
      router.refresh();
      return;
    }

    if (res.status === 400) {
      applyZodTreeErrors(body.error, form.setError);
      return;
    }

    if (res.status === 409) {
      form.setError("email", { type: "server", message: capitalize(body.error) });
      return;
    }

    setFormError(capitalize(body.error ?? "Ocurrió un error, intentá de nuevo."));
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <IconFormField
        control={form.control}
        name="name"
        label="Nombre completo"
        icon={User}
        placeholder="Tu nombre completo"
        description="Ingresa tu nombre completo"
      />
      <IconFormField
        control={form.control}
        name="email"
        label="Correo electrónico"
        icon={Mail}
        type="email"
        placeholder="tu@email.com"
        description="Ingresa tu dirección de correo electrónico."
      />
      <IconFormField
        control={form.control}
        name="password"
        label="Contraseña"
        icon={Lock}
        type="password"
        placeholder="••••••••"
        description="Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo."
      />
      <IconFormField
        control={form.control}
        name="confirmPassword"
        label="Confirmar contraseña"
        icon={Lock}
        type="password"
        placeholder="••••••••"
      />

      {formError && (
        <p className="text-sm font-medium text-destructive">{formError}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
