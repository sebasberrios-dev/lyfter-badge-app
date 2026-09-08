import { notFound, redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { adminsGetEventsHandler } from "@/modules/events/events.actions";
import { adminsGetEventParticipantsHandler } from "@/modules/redemptions/redemptions.actions";
import { EventSubNav } from "@/components/admin/events/event-sub-nav";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminEventParticipantsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

  const { eventId: eventIdParam } = await params;
  const eventId = Number(eventIdParam);
  if (Number.isNaN(eventId)) notFound();

  const eventResult = await adminsGetEventsHandler(eventId);
  if (!eventResult.success || !eventResult.data || Array.isArray(eventResult.data))
    notFound();
  const event = eventResult.data;

  const participantsResult = await adminsGetEventParticipantsHandler(eventId);
  const participants =
    participantsResult.success && participantsResult.data
      ? participantsResult.data
      : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
      <EventSubNav eventId={event.id} />

      <h2 className="text-lg font-semibold text-foreground">Participantes</h2>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía nadie se inscribió a este evento.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Inscrito el</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>XP del evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => {
              const pct =
                participant.totalBadges > 0
                  ? (participant.redeemedCount / participant.totalBadges) * 100
                  : 0;
              return (
                <TableRow key={participant.userId}>
                  <TableCell className="font-medium text-foreground">
                    {participant.name}
                  </TableCell>
                  <TableCell>{participant.email}</TableCell>
                  <TableCell>
                    {participant.registeredAt.toLocaleDateString("es-CR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="w-24" />
                      <span className="text-xs text-muted-foreground">
                        {participant.redeemedCount}/{participant.totalBadges}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{participant.eventXp} XP</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
