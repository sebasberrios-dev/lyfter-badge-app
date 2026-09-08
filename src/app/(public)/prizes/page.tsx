import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPublicEventsHandler } from "@/modules/events/events.actions";
import type { EventWithCompany } from "@/modules/events/events.types";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventDate, cn } from "@/lib/utils";

function PrizeEventCard({
  event,
  href,
}: {
  event: EventWithCompany & { prizeDescription: string };
  href: string | null;
}) {
  const content = (
    <Card className={cn(href && "transition-colors hover:bg-muted/50")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{event.name}</p>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3" />
            {formatEventDate(event.startDate)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Organizado por {event.company.name}
        </p>
        <p className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
          <Trophy className="size-4 shrink-0 translate-y-0.5 text-primary" />
          <span>{event.prizeDescription}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Se revela por completo al conseguir el 100% de los badges del
          evento — acá te mostramos qué te espera.
        </p>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function PrizesPage() {
  const [events, session] = await Promise.all([
    getPublicEventsHandler(),
    getSession(),
  ]);

  const eventsWithPrize = events.filter(
    (event): event is EventWithCompany & { prizeDescription: string } =>
      !!event.prizeDescription,
  );

  const canLinkToDetail = session?.role === "PARTICIPANT";

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
          Premios
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Completá todos los badges de un evento y desbloqueá su premio.
        </p>
      </div>

      {eventsWithPrize.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Todavía no hay premios configurados. Volvé pronto.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {eventsWithPrize.map((event) => (
            <PrizeEventCard
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
