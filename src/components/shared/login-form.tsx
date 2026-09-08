"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";
import type { z } from "zod";
import { loginSchema } from "@/modules/users/users.schema";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    const res = await fetch("/api/auth/login", {
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
        description="Ingresa tu contraseña."
      />

      {formError && (
        <p className="text-sm font-medium text-destructive">{formError}</p>
      )}

      <Button
        type="submit"
        className="w-full font-bold"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Ingresando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
