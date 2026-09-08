import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPublicEventsHandler } from "@/modules/events/events.actions";
import type { EventWithCompany } from "@/modules/events/events.types";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { formatEventDate, cn } from "@/lib/utils";

const STATUS_LABELS: Record<"ACTIVE" | "FINISHED", string> = {
  ACTIVE: "En curso",
  FINISHED: "Finalizado",
};

function PublicEventCard({
  event,
  href,
}: {
  event: EventWithCompany;
  href: string | null;
}) {
  const content = (
    <Card className={cn(href && "transition-colors hover:bg-muted/50")}>
      <div className="aspect-video w-full bg-linear-to-br from-sky/30 via-lilac/30 to-coral/30" />
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{event.name}</p>
          <UiBadge variant={event.status === "ACTIVE" ? "default" : "outline"}>
            {STATUS_LABELS[event.status as "ACTIVE" | "FINISHED"]}
          </UiBadge>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Organizado por {event.company.name}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {event.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <UiBadge variant="outline">{MODALITY_LABELS[event.modality]}</UiBadge>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3" />
            {formatEventDate(event.startDate)} – {formatEventDate(event.endDate)}
          </span>
          {event.modality !== "VIRTUAL" && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {event.location}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function PublicEventsPage() {
  const [events, session] = await Promise.all([
    getPublicEventsHandler(),
    getSession(),
  ]);

  const canLinkToDetail = session?.role === "PARTICIPANT";

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
          Eventos
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Descubrí los eventos activos y pasados de nuestras empresas
          aliadas.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Todavía no hay eventos publicados. Volvé pronto.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <PublicEventCard
              key={event.id}
              event={event}
              href={canLinkToDetail ? `/events/${event.id}` : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
