"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Event } from "@prisma/client";
import { CalendarDays, MapPin, Globe, Gift } from "lucide-react";
import { updateEventSchema } from "@/modules/events/events.schema";
import type { updateEventInput } from "@/modules/events/events.types";
import { updateEventHandler } from "@/modules/events/events.actions";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { TextareaFormField } from "@/components/shared/textarea-form-field";
import { SelectFormField } from "@/components/shared/select-form-field";
import { DatetimeFormField } from "@/components/shared/datetime-form-field";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

const MODALITY_OPTIONS = Object.entries(MODALITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function EditEventForm({ event }: { event: Event }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<updateEventInput>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: {
      name: event.name,
      description: event.description,
      location: event.location,
      country: event.country,
      modality: event.modality,
      startDate: event.startDate,
      endDate: event.endDate,
      latitude: event.latitude ?? undefined,
      longitude: event.longitude ?? undefined,
      prizeDescription: event.prizeDescription ?? "",
    },
  });

  async function onSubmit(values: updateEventInput) {
    setFormError(null);
    setSuccessMessage(null);

    try {
      const result = await updateEventHandler(event.id, values);

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

      setSuccessMessage("Cambios guardados.");
      router.refresh();
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
      <IconFormField
        control={form.control}
        name="name"
        label="Nombre"
        icon={CalendarDays}
      />
      <TextareaFormField
        control={form.control}
        name="description"
        label="Descripción"
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
      {successMessage && (
        <p className="text-sm font-medium text-primary">{successMessage}</p>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
