"use client";

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/utils";

interface IconFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  description?: string;
}

export function IconFormField<T extends FieldValues>({
  control,
  name,
  label,
  icon: Icon,
  type = "text",
  placeholder,
  description,
}: IconFormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <div className="relative">
            <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            {type === "number" ? (
              // Input de texto sin controlar (defaultValue, no value): un <input type="number">
              // controlado renormaliza el texto mostrado a partir del número parseado en cada
              // tecla (ej. borrar el "9" inicial de "9.9281" queda mostrando "0.9281" de nuevo),
              // lo que impide editar decimales. Al dejarlo sin controlar, el navegador es dueño
              // del texto en pantalla; solo empujamos el número parseado hacia RHF.
              <Input
                id={name}
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                className="pl-9"
                aria-invalid={fieldState.invalid}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                defaultValue={field.value ?? ""}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  if (next === "") {
                    field.onChange(undefined);
                    return;
                  }
                  const parsed = Number(next);
                  field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                }}
              />
            ) : (
              <Input
                id={name}
                type={type}
                placeholder={placeholder}
                className="pl-9"
                aria-invalid={fieldState.invalid}
                {...field}
              />
            )}
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError
            errors={
              fieldState.error
                ? [{ ...fieldState.error, message: capitalize(fieldState.error.message ?? "") }]
                : undefined
            }
          />
        </Field>
      )}
    />
  );
}
