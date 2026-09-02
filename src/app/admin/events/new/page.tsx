import { redirect } from "next/navigation";
import { ForbiddenError, requireRole } from "@/lib/auth-guard";
import { getAllCompaniesHandler } from "@/modules/companies/companies.actions";
import { CreateEventForm } from "@/components/admin/events/create-event-form";

export default async function NewEventPage() {
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/admin/dashboard");
    redirect("/login");
  }

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
      <h1 className="text-2xl font-bold text-foreground">Nuevo evento</h1>
      <CreateEventForm
        role={session.role}
        companies={companies}
        fixedCompanyId={session.companyId}
      />
    </div>
  );
}
