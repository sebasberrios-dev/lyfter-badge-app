"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBadgeHandler } from "@/modules/badges/badges.actions";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteBadgeButton({
  badgeId,
  badgeName,
}: {
  badgeId: number;
  badgeName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deleteBadgeHandler(badgeId);
    setPending(false);

    if (!result.success) {
      setError(
        capitalize(
          typeof result.error === "string"
            ? result.error
            : "Ocurrió un error, intentá de nuevo.",
        ),
      );
      return;
    }

    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" className="text-destructive" />}
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {badgeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Solo se puede eliminar un badge
            sin canjes asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
