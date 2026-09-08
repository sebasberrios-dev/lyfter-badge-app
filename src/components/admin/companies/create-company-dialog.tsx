"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Plus } from "lucide-react";
import { createCompanySchema } from "@/modules/companies/companies.schema";
import type { createCompanyInput } from "@/modules/companies/companies.types";
import { createCompanyHandler } from "@/modules/companies/companies.actions";
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

export function CreateCompanyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<createCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: createCompanyInput) {
    setFormError(null);
    const result = await createCompanyHandler(values);

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
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Nueva empresa
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva empresa</DialogTitle>
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
            placeholder="Acme Corp"
          />
          {formError && (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
