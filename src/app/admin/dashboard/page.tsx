import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ForbiddenError, requireRole, UnauthenticatedError } from "@/lib/auth-guard";
import { getDashboardMetricsHandler } from "@/modules/dashboard/dashboard.actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/modules/dashboard/dashboard.types";

// Mismo ciclo de color que el Figma final: sage / sky / lilac por fila,
// no por rareza del badge (RARITY_STYLES es para pills de texto, no barras sólidas).
const TOP_BADGE_BAR_COLORS = ["bg-sage", "bg-sky", "bg-lilac"];

const EMPTY_METRICS: DashboardMetrics = {
  attendeesCount: 0,
  attendeesTrend: { available: false },
  totalRedemptionsCount: 0,
  redemptionsPerAttendee: 0,
  redemptionsTrend: null,
  activeEventsCount: 0,
  activeEventBadgeCounts: { talks: 0, booths: 0 },
  topRedeemedBadges: [],
  redemptionsByHour: [],
  recentRedemptions: [],
};

export default async function AdminDashboardPage() {
  try {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthenticatedError) {
      redirect("/login");
    }
    throw err;
  }

  const result = await getDashboardMetricsHandler();
  const metrics = result.success && result.data ? result.data : EMPTY_METRICS;

  const maxBadgeCount = Math.max(0, ...metrics.topRedeemedBadges.map((b) => b.count));
  const maxHourCount = Math.max(0, ...metrics.redemptionsByHour.map((h) => h.count));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-sage">
          <CardContent>
            <p className="text-sm text-muted-foreground">Total de asistentes</p>
            <p className="text-2xl font-bold text-foreground">{metrics.attendeesCount}</p>
            {metrics.attendeesTrend.available && (
              <div className="flex items-center gap-1">
                {metrics.attendeesTrend.percentChange >= 0 ? (
                  <ArrowUp className="h-3.5 w-3.5 text-success" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-danger" />
                )}
                <p
                  className={cn(
                    "text-xs",
                    metrics.attendeesTrend.percentChange >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {metrics.attendeesTrend.percentChange >= 0 ? "+" : ""}
                  {metrics.attendeesTrend.percentChange}% {metrics.attendeesTrend.label}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-sky">
          <CardContent>
            <p className="text-sm text-muted-foreground">Badges canjeados</p>
            <p className="text-2xl font-bold text-foreground">
              {metrics.totalRedemptionsCount}
            </p>
            <div className="flex items-center gap-1">
              {metrics.redemptionsTrend === "up" && (
                <ArrowUp className="h-3.5 w-3.5 text-success" />
              )}
              {metrics.redemptionsTrend === "down" && (
                <ArrowDown className="h-3.5 w-3.5 text-danger" />
              )}
              <p
                className={cn(
                  "text-xs",
                  metrics.redemptionsTrend === "up" && "text-success",
                  metrics.redemptionsTrend === "down" && "text-danger",
                  metrics.redemptionsTrend === null && "text-muted-foreground",
                )}
              >
                {metrics.redemptionsPerAttendee} por asistente
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-lilac">
          <CardContent>
            <p className="text-sm text-muted-foreground">Eventos activos</p>
            <p className="text-2xl font-bold text-foreground">
              {metrics.activeEventsCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.activeEventBadgeCounts.talks} charlas •{" "}
              {metrics.activeEventBadgeCounts.booths} stands
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="[--card-spacing:--spacing(6)]">
          <CardContent className="space-y-6">
            <h2 className="text-sm font-bold text-foreground">
              Charlas y stands más visitados
            </h2>
            {metrics.topRedeemedBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay canjes registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.topRedeemedBadges.map((badge, index) => (
                  <div key={badge.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm text-foreground">
                      {badge.name}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", TOP_BADGE_BAR_COLORS[index % 3])}
                        style={{ width: `${(badge.count / maxBadgeCount) * 100}%` }}
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

        <Card className="[--card-spacing:--spacing(6)]">
          <CardContent className="space-y-6">
            <h2 className="text-sm font-bold text-foreground">Últimos badges canjeados</h2>
            {metrics.recentRedemptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay canjes registrados.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentRedemptions.map((r) => (
                    <TableRow key={`${r.userId}-${r.badgeId}`}>
                      <TableCell>{r.userName}</TableCell>
                      <TableCell>{r.badgeName}</TableCell>
                      <TableCell>{r.redeemAt.toLocaleString("es-CR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Horarios de mayor afluencia
        </h2>
        <div className="flex h-32 items-end gap-1">
          {metrics.redemptionsByHour.map((bucket) => {
            const barHeight =
              maxHourCount === 0
                ? 2
                : Math.max(2, Math.round((bucket.count / maxHourCount) * 96));
            return (
              <div key={bucket.hour} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-1.5 rounded-t bg-sage"
                  style={{ height: `${barHeight}px` }}
                  title={`${bucket.hour}:00 — ${bucket.count} canjes`}
                />
                <span className="text-[10px] text-muted-foreground">{bucket.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
