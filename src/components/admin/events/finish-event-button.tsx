"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlagOff } from "lucide-react";
import { finishEventHandler } from "@/modules/events/events.actions";
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

export function FinishEventButton({
  eventId,
  eventName,
}: {
  eventId: number;
  eventName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFinish() {
    setPending(true);
    setError(null);
    const result = await finishEventHandler(eventId);
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
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <FlagOff className="size-4" />
        Finalizar evento
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Finalizar {eventName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El evento dejará de aceptar
            nuevos canjes de badges.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleFinish} disabled={pending}>
            {pending ? "Finalizando..." : "Finalizar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
