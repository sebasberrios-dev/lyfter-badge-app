"use client";

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { capitalize, toDatetimeLocalString } from "@/lib/utils";

interface DatetimeFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}

export function DatetimeFormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: DatetimeFormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            id={name}
            type="datetime-local"
            aria-invalid={fieldState.invalid}
            value={field.value ? toDatetimeLocalString(field.value) : ""}
            onChange={(e) =>
              field.onChange(e.target.value ? new Date(e.target.value) : undefined)
            }
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
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
