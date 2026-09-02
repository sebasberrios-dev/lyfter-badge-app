"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Role } from "@prisma/client";
import { CalendarDays, MapPin, Globe, Gift } from "lucide-react";
import { createEventSchema } from "@/modules/events/events.schema";
import type { createEventInput } from "@/modules/events/events.types";
import { createEventHandler } from "@/modules/events/events.actions";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { TextareaFormField } from "@/components/shared/textarea-form-field";
import { SelectFormField } from "@/components/shared/select-form-field";
import { DatetimeFormField } from "@/components/shared/datetime-form-field";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { capitalize } from "@/lib/utils";

const MODALITY_OPTIONS = Object.entries(MODALITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function CreateEventForm({
  role,
  companies,
  fixedCompanyId,
}: {
  role: Role;
  companies: { id: number; name: string }[];
  fixedCompanyId: number | null;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(
    fixedCompanyId ? String(fixedCompanyId) : null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<createEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      country: "",
      prizeDescription: "",
    },
  });

  async function onSubmit(values: createEventInput) {
    setFormError(null);

    if (!companyId) {
      setFormError("Elegí una empresa para el evento.");
      return;
    }

    try {
      const result = await createEventHandler(values, Number(companyId));

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

      if (!result.data) {
        setFormError("Ocurrió un error, intentá de nuevo.");
        return;
      }

      router.push(`/admin/events/${result.data.id}`);
    } catch {
      setFormError("Ocurrió un error de conexión, intentá de nuevo.");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-w-xl space-y-4"
      noValidate
    >
      {role === "SUPER_ADMIN" && (
        <Field>
          <FieldLabel htmlFor="companyId">Empresa</FieldLabel>
          <Select
            items={companies.map((company) => ({
              value: String(company.id),
              label: company.name,
            }))}
            value={companyId}
            onValueChange={setCompanyId}
          >
            <SelectTrigger id="companyId" className="w-full">
              <SelectValue placeholder="Elegí una empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <IconFormField
        control={form.control}
        name="name"
        label="Nombre"
        icon={CalendarDays}
        placeholder="Lyfter DevCon 2026"
      />
      <TextareaFormField
        control={form.control}
        name="description"
        label="Descripción"
        placeholder="Mínimo 20 caracteres..."
      />
      <IconFormField
        control={form.control}
        name="location"
        label="Ubicación"
        icon={MapPin}
      />
      <IconFormField
        control={form.control}
        name="country"
        label="País"
        icon={Globe}
      />
      <div className="grid grid-cols-2 gap-4">
        <IconFormField
          control={form.control}
          name="latitude"
          label="Latitud (opcional)"
          icon={MapPin}
          type="number"
        />
        <IconFormField
          control={form.control}
          name="longitude"
          label="Longitud (opcional)"
          icon={MapPin}
          type="number"
        />
      </div>
      <SelectFormField
        control={form.control}
        name="modality"
        label="Modalidad"
        options={MODALITY_OPTIONS}
        placeholder="Elegí una modalidad"
      />
      <DatetimeFormField
        control={form.control}
        name="startDate"
        label="Fecha de inicio"
      />
      <DatetimeFormField
        control={form.control}
        name="endDate"
        label="Fecha de finalización"
      />
      <IconFormField
        control={form.control}
        name="prizeDescription"
        label="Premio (opcional)"
        icon={Gift}
        description="Se revela solo cuando un participante completa todos los badges."
      />

      {formError && (
        <p className="text-sm font-medium text-destructive">{formError}</p>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creando..." : "Crear evento"}
      </Button>
    </form>
  );
}
