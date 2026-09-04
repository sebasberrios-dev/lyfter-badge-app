import { notFound, redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { adminsGetEventsHandler } from "@/modules/events/events.actions";
import { adminsGetEventMetricsHandler } from "@/modules/redemptions/redemptions.actions";
import { EventSubNav } from "@/components/admin/events/event-sub-nav";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mismo ciclo de color que el dashboard admin: sage / sky / lilac por fila,
// no por rareza del badge (RARITY_STYLES es para pills de texto, no barras sólidas).
const TOP_BADGE_BAR_COLORS = ["bg-sage", "bg-sky", "bg-lilac"];

export default async function AdminEventMetricsPage({
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

  const metricsResult = await adminsGetEventMetricsHandler(eventId);
  const metrics =
    metricsResult.success && metricsResult.data
      ? metricsResult.data
      : {
          participantsCount: 0,
          avgCompletionPct: 0,
          flaggedRedemptionsCount: 0,
          badgesRedeemedByType: [],
        };

  const maxCount = Math.max(
    0,
    ...metrics.badgesRedeemedByType.map((badge) => badge.count),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
      <EventSubNav eventId={event.id} />

      <h2 className="text-lg font-semibold text-foreground">Métricas</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Participantes inscritos
            </p>
            <p className="text-2xl font-bold text-foreground">
              {metrics.participantsCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              % completitud promedio
            </p>
            <p className="text-2xl font-bold text-foreground">
              {metrics.avgCompletionPct}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Canjes flagged</p>
            <p className="text-2xl font-bold text-foreground">
              {metrics.flaggedRedemptionsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="space-y-6">
          <h3 className="text-sm font-bold text-foreground">Más visitados</h3>
          {metrics.badgesRedeemedByType.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este evento todavía no tiene badges.
            </p>
          ) : maxCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay canjes registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.badgesRedeemedByType.map((badge, index) => (
                <div key={badge.id} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-foreground">
                    {badge.name}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        TOP_BADGE_BAR_COLORS[index % 3],
                      )}
                      style={{ width: `${(badge.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm text-muted-foreground">
                    {badge.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
