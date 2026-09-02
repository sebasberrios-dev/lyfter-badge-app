import { notFound, redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { adminsGetEventsHandler } from "@/modules/events/events.actions";
import { getBadgeByFieldHandler } from "@/modules/badges/badges.actions";
import { EventSubNav } from "@/components/admin/events/event-sub-nav";
import { CreateBadgeDialog } from "@/components/admin/events/create-badge-dialog";
import { EditBadgeDialog } from "@/components/admin/events/edit-badge-dialog";
import { DeleteBadgeButton } from "@/components/admin/events/delete-badge-button";
import { BadgeIconGlyph } from "@/components/shared/badge-icon-glyph";
import { TYPE_LABELS, RARITY_LABELS } from "@/lib/badge-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminEventBadgesPage({
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

  const badgesResult = await getBadgeByFieldHandler({ eventId });
  const badges = badgesResult.success && badgesResult.data ? badgesResult.data : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
      <EventSubNav eventId={event.id} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Badges</h2>
        <CreateBadgeDialog eventId={event.id} />
      </div>

      {badges.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este evento todavía no tiene badges.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ícono</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Rareza</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {badges.map((badge) => (
              <TableRow key={badge.id}>
                <TableCell>
                  <BadgeIconGlyph icon={badge.icon} rarity={badge.rarity} />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {badge.name}
                </TableCell>
                <TableCell>{TYPE_LABELS[badge.type]}</TableCell>
                <TableCell>{RARITY_LABELS[badge.rarity]}</TableCell>
                <TableCell>{badge.xpValue}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <EditBadgeDialog badge={badge} />
                    <DeleteBadgeButton
                      badgeId={badge.id}
                      badgeName={badge.name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
