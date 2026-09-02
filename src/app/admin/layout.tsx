import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserProfile } from "@/modules/users/users.service";
import { UserNotFoundError } from "@/modules/users/users.errors";
import { Logo } from "@/components/shared/logo";
import { UserNavMenu } from "@/components/shared/user-nav-menu";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PARTICIPANT") redirect("/");

  let profile;
  try {
    profile = await getUserProfile(session.userId);
  } catch (err) {
    // Cookie de sesión firmada apuntando a un usuario que ya no existe
    // (cuenta borrada, reset de DB) -- tratar igual que "sin sesión".
    if (err instanceof UserNotFoundError) redirect("/login");
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <AdminMobileNav role={session.role} />
          <Logo />
        </div>
        <UserNavMenu name={profile.name} role={session.role} />
      </header>
      <div className="flex flex-1">
        <AdminSidebar role={session.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
