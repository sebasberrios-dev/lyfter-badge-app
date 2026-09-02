import { redirect } from "next/navigation";
import Link from "next/link";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { getAllCompaniesHandler } from "@/modules/companies/companies.actions";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { CreateCompanyDialog } from "@/components/admin/companies/create-company-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  try {
    await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

  const { q, page: pageParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const result = await getAllCompaniesHandler({ name: q }, page, PAGE_SIZE);
  const { companies, total } =
    result.success && result.data ? result.data : { companies: [], total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
        <CreateCompanyDialog />
      </div>

      <form method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre..."
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {companies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay empresas registradas todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Admins</TableHead>
              <TableHead>Eventos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>{company._count.users}</TableCell>
                <TableCell>{company._count.events}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PaginationControls page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
