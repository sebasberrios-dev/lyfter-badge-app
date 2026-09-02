import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getUserProfile } from "@/modules/users/users.service";
import { UserNotFoundError } from "@/modules/users/users.errors";
import { getLevelForXp } from "@/modules/xp-levels/xp-levels.service";
import {
  getMyRedemptionsHandler,
  getMyRegisteredEventsHandler,
} from "@/modules/redemptions/redemptions.actions";
import { XpProgress } from "@/components/participant/xp-progress";
import { StatCard } from "@/components/participant/stat-card";
import { EventSummaryCard } from "@/components/participant/event-summary-card";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();
  if (!session) return null;

  let profile;
  try {
    profile = await getUserProfile(session.userId);
  } catch (err) {
    if (err instanceof UserNotFoundError) redirect("/login");
    throw err;
  }
  const level = getLevelForXp(profile.totalXp);

  const [redemptionsResult, eventsResult] = await Promise.all([
    getMyRedemptionsHandler(),
    getMyRegisteredEventsHandler(),
  ]);

  const badgeCount = redemptionsResult.success
    ? (redemptionsResult.data?.length ?? 0)
    : 0;
  const registrations = eventsResult.success ? (eventsResult.data ?? []) : [];

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hola, {profile.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Este es tu progreso hasta ahora.
        </p>
      </div>

      <XpProgress totalXp={profile.totalXp} level={level} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Badges obtenidos" value={badgeCount} icon={Award} />
        <StatCard label="Eventos inscritos" value={registrations.length} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Tus eventos</h2>
        {registrations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Todavía no te inscribiste a ningún evento.
            </p>
            <Link
              href="/scan"
              className={buttonVariants({
                variant: "outline",
                className: "mt-3",
              })}
            >
              Escanear QR de bienvenida
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {registrations.slice(0, 3).map((registration) => (
              <EventSummaryCard
                key={registration.eventId}
                event={registration.event}
                eventXp={registration.eventXp}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
