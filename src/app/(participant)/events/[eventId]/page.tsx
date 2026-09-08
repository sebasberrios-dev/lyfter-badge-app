import { notFound } from "next/navigation";
import { getEventByIdHandler } from "@/modules/events/events.actions";
import { getBadgesForEventHandler } from "@/modules/badges/badges.actions";
import { getMyRedemptionsHandler } from "@/modules/redemptions/redemptions.actions";
import { getEventLeaderboardHandler } from "@/modules/leaderboard/leaderboard.actions";
import { BadgeCard } from "@/components/participant/badge-card";
import { LeaderboardTable } from "@/components/participant/leaderboard-table";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { formatEventDate, cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Lock, MapPin, Trophy } from "lucide-react";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: eventIdParam } = await params;
  const eventId = Number(eventIdParam);
  if (Number.isNaN(eventId)) notFound();

  const eventResult = await getEventByIdHandler(eventId);
  if (!eventResult.success || !eventResult.data) notFound();
  const event = eventResult.data;

  const [badgesResult, redemptionsResult, leaderboardResult] = await Promise.all([
    getBadgesForEventHandler(eventId),
    getMyRedemptionsHandler(),
    getEventLeaderboardHandler(eventId, 5),
  ]);

  const badges = badgesResult.success ? badgesResult.data ?? [] : [];
  const redeemedBadgeIds = new Set(
    (redemptionsResult.success ? redemptionsResult.data ?? [] : [])
      .filter((redemption) => redemption.badge.eventId === eventId)
      .map((redemption) => redemption.badgeId),
  );
  const leaderboardEntries = leaderboardResult.success ? leaderboardResult.data ?? [] : [];
  const isComplete = badges.length > 0 && redeemedBadgeIds.size === badges.length;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <UiBadge variant="outline">{MODALITY_LABELS[event.modality]}</UiBadge>
          <span>
            {formatEventDate(event.startDate)} – {formatEventDate(event.endDate)}
          </span>
          {event.modality !== "VIRTUAL" && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {event.location}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{event.description}</p>
        {event.prizeDescription &&
          (isComplete ? (
            <p className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
              <Trophy className="size-4 shrink-0 translate-y-0.5 text-primary" />
              <span>Premio: {event.prizeDescription}</span>
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0 translate-y-0.5" />
              <span>Completá todos los badges de este evento para desbloquear el premio.</span>
            </p>
          ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Badges — {redeemedBadgeIds.size} de {badges.length} completados
        </h2>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este evento aún no tiene badges configurados.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                redeemed={redeemedBadgeIds.has(badge.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Ranking del evento</h2>
          <Link href="/leaderboard" className={cn(buttonVariants({ variant: "link", size: "sm" }))}>
            Ver más
          </Link>
        </div>
        <LeaderboardTable variant="event" entries={leaderboardEntries} />
      </section>
    </div>
  );
}
