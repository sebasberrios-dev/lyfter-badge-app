"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Award, Pencil, Sparkles } from "lucide-react";
import { BadgeType, BadgeRarity, type Badge } from "@prisma/client";
import { updateBadgeSchema, BADGE_ICONS } from "@/modules/badges/badges.schema";
import type { updateBadgeInput } from "@/modules/badges/badges.types";
import { updateBadgeHandler } from "@/modules/badges/badges.actions";
import { applyZodTreeErrors } from "@/lib/zod-tree-errors";
import { IconFormField } from "@/components/shared/icon-form-field";
import { TextareaFormField } from "@/components/shared/textarea-form-field";
import { SelectFormField } from "@/components/shared/select-form-field";
import { TYPE_LABELS, RARITY_LABELS } from "@/lib/badge-display";
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

const ICON_LABELS: Record<(typeof BADGE_ICONS)[number], string> = {
  welcome: "Bienvenida",
  talk: "Charla",
  booth: "Stand",
  special: "Especial",
};

const ICON_OPTIONS = BADGE_ICONS.map((icon) => ({
  value: icon,
  label: ICON_LABELS[icon],
}));
const TYPE_OPTIONS = Object.values(BadgeType).map((type) => ({
  value: type,
  label: TYPE_LABELS[type],
}));
const RARITY_OPTIONS = Object.values(BadgeRarity).map((rarity) => ({
  value: rarity,
  label: RARITY_LABELS[rarity],
}));

export function EditBadgeDialog({ badge }: { badge: Badge }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<updateBadgeInput>({
    resolver: zodResolver(updateBadgeSchema),
    defaultValues: {
      name: badge.name,
      description: badge.description,
      xpValue: badge.xpValue,
      icon: badge.icon as updateBadgeInput["icon"],
      type: badge.type,
      rarity: badge.rarity,
    },
  });

  async function onSubmit(values: updateBadgeInput) {
    setFormError(null);
    const result = await updateBadgeHandler(badge.id, values);

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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar badge</DialogTitle>
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
            icon={Award}
          />
          <TextareaFormField
            control={form.control}
            name="description"
            label="Descripción"
          />
          <IconFormField
            control={form.control}
            name="xpValue"
            label="XP"
            icon={Sparkles}
            type="number"
          />
          <SelectFormField
            control={form.control}
            name="icon"
            label="Ícono"
            options={ICON_OPTIONS}
          />
          <SelectFormField
            control={form.control}
            name="type"
            label="Tipo"
            options={TYPE_OPTIONS}
          />
          <SelectFormField
            control={form.control}
            name="rarity"
            label="Rareza"
            options={RARITY_OPTIONS}
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
