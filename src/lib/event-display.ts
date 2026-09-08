import type { EventStatus } from "@prisma/client";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  FINISHED: "Finalizado",
};

export const EVENT_STATUS_STYLES: Record<EventStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-accent/15 text-accent",
  FINISHED:
    "bg-[color-mix(in_oklch,var(--color-sage),transparent_80%)] text-[color:var(--color-sage)]",
};
