import { redirect } from "next/navigation";
import Link from "next/link";
import { EventModality, EventStatus } from "@prisma/client";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { adminsGetEventsPaginatedHandler } from "@/modules/events/events.actions";
import { getAllCompaniesHandler } from "@/modules/companies/companies.actions";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { MODALITY_LABELS } from "@/components/participant/event-summary-card";
import { EVENT_STATUS_LABELS } from "@/lib/event-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatEventDate } from "@/lib/utils";

const PAGE_SIZE = 20;
const STATUSES = Object.values(EventStatus);
const MODALITIES = Object.values(EventModality);

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    modality?: string;
    companyId?: string;
    page?: string;
  }>;
}) {
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  const result = await adminsGetEventsPaginatedHandler(
    {
      name: params.q || undefined,
      status: (params.status as EventStatus) || undefined,
      modality: (params.modality as EventModality) || undefined,
      companyId:
        session.role === "SUPER_ADMIN" && params.companyId
          ? Number(params.companyId)
          : undefined,
    },
    page,
    PAGE_SIZE,
  );
  const { events, total } =
    result.success && result.data ? result.data : { events: [], total: 0 };

  const companiesResult =
    session.role === "SUPER_ADMIN"
      ? await getAllCompaniesHandler(undefined, 1, 100)
      : null;
  const companies =
    companiesResult?.success && companiesResult.data
      ? companiesResult.data.companies
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
        <Link href="/admin/events/new" className={buttonVariants()}>
          Nuevo evento
        </Link>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nombre..."
          className="max-w-xs"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todo estado</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          name="modality"
          defaultValue={params.modality ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toda modalidad</option>
          {MODALITIES.map((modality) => (
            <option key={modality} value={modality}>
              {MODALITY_LABELS[modality]}
            </option>
          ))}
        </select>
        {session.role === "SUPER_ADMIN" && (
          <select
            name="companyId"
            defaultValue={params.companyId ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Toda empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay eventos que coincidan con estos filtros.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              {session.role === "SUPER_ADMIN" && <TableHead>Empresa</TableHead>}
              <TableHead>Modalidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fechas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {event.name}
                  </Link>
                </TableCell>
                {session.role === "SUPER_ADMIN" && (
                  <TableCell>{event.company.name}</TableCell>
                )}
                <TableCell>{MODALITY_LABELS[event.modality]}</TableCell>
                <TableCell>
                  <UiBadge variant="outline">
                    {EVENT_STATUS_LABELS[event.status]}
                  </UiBadge>
                </TableCell>
                <TableCell>
                  {formatEventDate(event.startDate)} –{" "}
                  {formatEventDate(event.endDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PaginationControls page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
