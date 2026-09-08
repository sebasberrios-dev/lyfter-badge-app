import { redirect } from "next/navigation";
import { Award, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getUserProfile } from "@/modules/users/users.service";
import { UserNotFoundError } from "@/modules/users/users.errors";
import { getLevelForXp } from "@/modules/xp-levels/xp-levels.service";
import { getMyGlobalRankHandler } from "@/modules/leaderboard/leaderboard.actions";
import { getMyRedemptionsHandler } from "@/modules/redemptions/redemptions.actions";
import { XpProgress } from "@/components/participant/xp-progress";
import { StatCard } from "@/components/participant/stat-card";
import { LogoutButton } from "@/components/shared/logout-button";

export default async function ProfilePage() {
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

  const [redemptionsResult, rankResult] = await Promise.all([
    getMyRedemptionsHandler(),
    getMyGlobalRankHandler(),
  ]);

  const badgeCount = redemptionsResult.success ? redemptionsResult.data?.length ?? 0 : 0;
  const rank = rankResult.success ? rankResult.data?.rank : undefined;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {profile.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <XpProgress totalXp={profile.totalXp} level={level} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Badges obtenidos" value={badgeCount} icon={Award} />
        <StatCard
          label="Posición en el ranking"
          value={rank ? `#${rank}` : "—"}
          icon={Trophy}
        />
      </div>

      <LogoutButton className="mx-auto" />
    </div>
  );
}
