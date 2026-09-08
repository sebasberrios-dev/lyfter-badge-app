import Link from "next/link";
import type { EventModality } from "@prisma/client";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/utils";

export const MODALITY_LABELS: Record<EventModality, string> = {
  ONSITE: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrida",
};

type EventSummaryCardProps = {
  event: {
    id: number;
    name: string;
    startDate: Date;
    endDate: Date;
    modality: EventModality;
    location: string;
  };
  eventXp: number;
};

export function EventSummaryCard({ event, eventXp }: EventSummaryCardProps) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground">{event.name}</p>
            <UiBadge variant="outline">{eventXp} XP</UiBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatEventDate(event.startDate)} – {formatEventDate(event.endDate)}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{MODALITY_LABELS[event.modality]}</span>
            {event.modality !== "VIRTUAL" && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {event.location}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
