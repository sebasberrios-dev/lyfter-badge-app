"use client";

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { capitalize } from "@/lib/utils";

interface TextareaFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  description?: string;
}

export function TextareaFormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
}: TextareaFormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Textarea
            id={name}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            {...field}
          />
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
