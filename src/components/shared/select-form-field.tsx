"use client";

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalize } from "@/lib/utils";

interface SelectFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  icon?: LucideIcon;
  placeholder?: string;
  description?: string;
  options: { value: string; label: string }[];
}

export function SelectFormField<T extends FieldValues>({
  control,
  name,
  label,
  icon: Icon,
  placeholder,
  description,
  options,
}: SelectFormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select
            items={options}
            value={field.value ?? null}
            onValueChange={(value) => field.onChange(value)}
          >
            <SelectTrigger id={name} className="w-full" aria-invalid={fieldState.invalid}>
              {Icon && <Icon className="size-4 text-muted-foreground" />}
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
