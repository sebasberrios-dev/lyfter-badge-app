import { getMyRedemptionsHandler } from "@/modules/redemptions/redemptions.actions";
import { BadgeCard } from "@/components/participant/badge-card";
import type { RedemptionWithBadge } from "@/modules/redemptions/redemptions.types";

export default async function BadgesPage() {
  const result = await getMyRedemptionsHandler();
  const redemptions = result.success ? result.data ?? [] : [];

  const groups = new Map<number, { eventName: string; redemptions: RedemptionWithBadge[] }>();
  for (const redemption of redemptions) {
    const eventId = redemption.badge.eventId;
    const group = groups.get(eventId) ?? {
      eventName: redemption.badge.event.name,
      redemptions: [],
    };
    group.redemptions.push(redemption);
    groups.set(eventId, group);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground">Tus badges</h1>

      {groups.size === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no tenés badges. Escaneá el QR de un evento para empezar a coleccionarlos.
          </p>
        </div>
      ) : (
        Array.from(groups.entries()).map(([eventId, group]) => (
          <section key={eventId} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{group.eventName}</h2>
            <div className="grid grid-cols-2 gap-3">
              {group.redemptions.map((redemption) => (
                <BadgeCard key={redemption.badgeId} badge={redemption.badge} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
