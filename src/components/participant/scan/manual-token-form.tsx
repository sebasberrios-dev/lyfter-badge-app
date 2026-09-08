"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import type { z } from "zod";
import { redeemBadgeSchema } from "@/modules/redemptions/redemptions.schema";
import { IconFormField } from "@/components/shared/icon-form-field";
import { Button } from "@/components/ui/button";

const manualTokenSchema = redeemBadgeSchema.pick({ token: true });

type ManualTokenInput = z.infer<typeof manualTokenSchema>;

type ManualTokenFormProps = {
  onSubmit: (token: string) => void;
  disabled?: boolean;
};

export function ManualTokenForm({ onSubmit, disabled }: ManualTokenFormProps) {
  const form = useForm<ManualTokenInput>({
    resolver: zodResolver(manualTokenSchema),
    defaultValues: { token: "" },
  });

  function handleSubmit(values: ManualTokenInput) {
    onSubmit(values.token);
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4"
      noValidate
    >
      <IconFormField
        control={form.control}
        name="token"
        label="Código del badge"
        icon={KeyRound}
        placeholder="Pegá el código acá"
        description="Lo encontrás debajo del QR si no podés escanearlo."
      />
      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={disabled}>
          Reclamar badge
        </Button>
      </div>
    </form>
  );
}
