import { getSession } from "@/lib/auth";
import { getGlobalLeaderboardHandler } from "@/modules/leaderboard/leaderboard.actions";
import { getMyRegisteredEventsHandler } from "@/modules/redemptions/redemptions.actions";
import { LeaderboardView } from "@/components/participant/leaderboard-view";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [globalResult, eventsResult] = await Promise.all([
    getGlobalLeaderboardHandler(),
    getMyRegisteredEventsHandler(),
  ]);

  const globalEntries = globalResult.success ? globalResult.data ?? [] : [];
  const registrations = eventsResult.success ? eventsResult.data ?? [] : [];
  const registeredEvents = registrations.map((r) => ({
    id: r.event.id,
    name: r.event.name,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground">Ranking</h1>
      <LeaderboardView
        globalEntries={globalEntries}
        registeredEvents={registeredEvents}
        currentUserId={session.userId}
      />
    </div>
  );
}
