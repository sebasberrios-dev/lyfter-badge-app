import { notFound, redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { adminsGetEventsHandler } from "@/modules/events/events.actions";
import { EventSubNav } from "@/components/admin/events/event-sub-nav";
import { EditEventForm } from "@/components/admin/events/edit-event-form";
import { FinishEventButton } from "@/components/admin/events/finish-event-button";
import { DeleteEventButton } from "@/components/admin/events/delete-event-button";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { EVENT_STATUS_LABELS } from "@/lib/event-display";
import { Badge as UiBadge } from "@/components/ui/badge";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

  const { eventId: eventIdParam } = await params;
  const eventId = Number(eventIdParam);
  if (Number.isNaN(eventId)) notFound();

  const result = await adminsGetEventsHandler(eventId);
  if (!result.success || !result.data || Array.isArray(result.data)) notFound();
  const event = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <UiBadge variant="outline">
              {EVENT_STATUS_LABELS[event.status]}
            </UiBadge>
            <span>{MODALITY_LABELS[event.modality]}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {event.status !== "FINISHED" && (
            <FinishEventButton eventId={event.id} eventName={event.name} />
          )}
          {session.role === "SUPER_ADMIN" && (
            <DeleteEventButton eventId={event.id} eventName={event.name} />
          )}
        </div>
      </div>

      <EventSubNav eventId={event.id} />

      <EditEventForm event={event} />
    </div>
  );
}
