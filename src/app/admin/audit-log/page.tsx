import { redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { getAuditLogsHandler } from "@/modules/audit-log/audit-log.actions";
import { getAllCompaniesHandler } from "@/modules/companies/companies.actions";
import { PaginationControls } from "@/components/admin/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const ACTIONS = ["CREATE", "UPDATE", "DELETE"] as const;
const ENTITIES = ["COMPANY", "EVENT", "BADGE", "USER"] as const;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity?: string;
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

  const result = await getAuditLogsHandler({
    action: params.action || undefined,
    entity: params.entity || undefined,
    companyId: params.companyId ? Number(params.companyId) : undefined,
    page,
  });
  const { logs, total, pageSize } =
    result.success && result.data
      ? result.data
      : { logs: [], total: 0, pageSize: 25 };

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
      <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>

      <form method="get" className="flex flex-wrap gap-3">
        <select
          name="action"
          defaultValue={params.action ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toda acción</option>
          {ACTIONS.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          name="entity"
          defaultValue={params.entity ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toda entidad</option>
          {ENTITIES.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
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

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay registros de auditoría para estos filtros.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.createdAt.toLocaleString("es-CR")}</TableCell>
                <TableCell>{log.user.name}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  {log.entity} #{log.entityId}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PaginationControls page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
