"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { assignAdminByEmailHandler } from "@/modules/companies/companies.actions";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

const assignAdminSchema = z.object({
  email: z.email("correo inválido"),
});

type AssignAdminInput = z.infer<typeof assignAdminSchema>;

export function AssignAdminForm({ companyId }: { companyId: number }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<AssignAdminInput>({
    resolver: zodResolver(assignAdminSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: AssignAdminInput) {
    setFormError(null);
    setSuccessMessage(null);
    const result = await assignAdminByEmailHandler(values.email, companyId);

    if (!result.success) {
      if (typeof result.error === "object" && result.error !== null) {
        applyZodTreeErrors(result.error as never, form.setError);
        return;
      }
      setFormError(
        capitalize(result.error ?? "Ocurrió un error, intentá de nuevo."),
      );
      return;
    }

    form.reset();
    setSuccessMessage("Admin asignado correctamente.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2" noValidate>
      <div className="flex items-end gap-2">
        <div className="max-w-xs flex-1">
          <IconFormField
            control={form.control}
            name="email"
            label="Asignar admin por email"
            icon={Mail}
            type="email"
            placeholder="admin@empresa.com"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Asignando..." : "Asignar"}
        </Button>
      </div>
      {formError && (
        <p className="text-sm font-medium text-destructive">{formError}</p>
      )}
      {successMessage && (
        <p className="text-sm font-medium text-primary">{successMessage}</p>
      )}
    </form>
  );
}
