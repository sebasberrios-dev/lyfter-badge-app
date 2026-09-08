import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { getAllUsersHandler } from "@/modules/users/users.actions";
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
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;
const ROLES = Object.values(Role);

const ROLE_LABELS: Record<Role, string> = {
  PARTICIPANT: "Participante",
  COMPANY_ADMIN: "Admin de empresa",
  SUPER_ADMIN: "Super admin",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    companyId?: string;
    isActive?: string;
    page?: string;
  }>;
}) {
  try {
    await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  const result = await getAllUsersHandler(
    {
      q: params.q || undefined,
      role: (params.role as Role) || undefined,
      companyId: params.companyId ? Number(params.companyId) : undefined,
      isActive:
        params.isActive === "true"
          ? true
          : params.isActive === "false"
            ? false
            : undefined,
    },
    page,
    PAGE_SIZE,
  );
  const { users, total } =
    result.success && result.data ? result.data : { users: [], total: 0 };

  const companiesResult = await getAllCompaniesHandler(undefined, 1, 100);
  const companies =
    companiesResult.success && companiesResult.data
      ? companiesResult.data.companies
      : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>

      <form method="get" className="flex flex-wrap gap-3">
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nombre o email..."
          className="max-w-xs"
        />
        <select
          name="role"
          defaultValue={params.role ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todo rol</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
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
        <select
          name="isActive"
          defaultValue={params.isActive ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Activo o inactivo</option>
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay usuarios que coincidan con estos filtros.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>XP total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-foreground">
                  {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                <TableCell>{user.company?.name ?? "—"}</TableCell>
                <TableCell>
                  <UiBadge variant={user.isActive ? "outline" : "destructive"}>
                    {user.isActive ? "Sí" : "No"}
                  </UiBadge>
                </TableCell>
                <TableCell>{user.totalXp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PaginationControls page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
