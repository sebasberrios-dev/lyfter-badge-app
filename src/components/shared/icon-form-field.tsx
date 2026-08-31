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
            <Input
              id={name}
              type={type}
              placeholder={placeholder}
              className="pl-9"
              aria-invalid={fieldState.invalid}
              {...field}
            />
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
