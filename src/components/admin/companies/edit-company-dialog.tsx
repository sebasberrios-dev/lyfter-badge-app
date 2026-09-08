"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Pencil } from "lucide-react";
import { updateCompanySchema } from "@/modules/companies/companies.schema";
import type { updateCompanyInput } from "@/modules/companies/companies.types";
import { updateCompanyHandler } from "@/modules/companies/companies.actions";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { capitalize } from "@/lib/utils";

export function EditCompanyDialog({
  companyId,
  currentName,
}: {
  companyId: number;
  currentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<updateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: { name: currentName },
  });

  async function onSubmit(values: updateCompanyInput) {
    setFormError(null);
    const result = await updateCompanyHandler(companyId, values);

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

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Pencil className="size-4" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <IconFormField
            control={form.control}
            name="name"
            label="Nombre"
            icon={Building2}
          />
          {formError && (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
