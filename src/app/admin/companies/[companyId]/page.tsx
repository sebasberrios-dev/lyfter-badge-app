import { notFound, redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { getCompanyByIdHandler } from "@/modules/companies/companies.actions";
import { adminsGetEventsHandler } from "@/modules/events/events.actions";
import { EditCompanyDialog } from "@/components/admin/companies/edit-company-dialog";
import { AssignAdminForm } from "@/components/admin/companies/assign-admin-form";
import { DeleteCompanyButton } from "@/components/admin/companies/delete-company-button";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/utils";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  try {
    await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

  const { companyId: companyIdParam } = await params;
  const companyId = Number(companyIdParam);
  if (Number.isNaN(companyId)) notFound();

  const companyResult = await getCompanyByIdHandler(companyId);
  if (!companyResult.success || !companyResult.data) notFound();
  const { company, admins } = companyResult.data;

  const eventsResult = await adminsGetEventsHandler(undefined, { companyId });
  const events =
    eventsResult.success && Array.isArray(eventsResult.data)
      ? eventsResult.data
      : [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {admins.length} admin(s) · {events.length} evento(s)
          </p>
        </div>
        <div className="flex gap-2">
          <EditCompanyDialog companyId={company.id} currentName={company.name} />
          <DeleteCompanyButton companyId={company.id} companyName={company.name} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Admins</h2>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta empresa todavía no tiene administradores asignados.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {admins.map((admin) => (
              <li key={admin.id}>
                {admin.name} — {admin.email}
              </li>
            ))}
          </ul>
        )}
        <AssignAdminForm companyId={company.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Eventos</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta empresa todavía no tiene eventos.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <Card key={event.id}>
                <CardContent className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{event.name}</p>
                    <UiBadge variant="outline">{event.status}</UiBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {MODALITY_LABELS[event.modality]} ·{" "}
                    {formatEventDate(event.startDate)} –{" "}
                    {formatEventDate(event.endDate)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
