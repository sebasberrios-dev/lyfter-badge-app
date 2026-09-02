import Link from "next/link";
import { Menu } from "lucide-react";
import { getSession } from "@/lib/auth";
import type { SessionPayload } from "@/lib/session.types";
import { getUserProfile } from "@/modules/users/users.service";
import { UserNotFoundError } from "@/modules/users/users.errors";
import { Logo } from "@/components/shared/logo";
import { UserNavMenu } from "@/components/shared/user-nav-menu";
import { LogoutButton } from "@/components/shared/logout-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PUBLIC_NAV_LINKS } from "@/lib/nav-links";

async function resolveSessionUser(session: SessionPayload | null) {
  if (!session) return null;

  try {
    return { role: session.role, profile: await getUserProfile(session.userId) };
  } catch (err) {
    // Una cookie de sesión firmada puede sobrevivir a que el usuario que
    // referencia ya no exista (cuenta borrada, reset de DB) -- se trata como
    // "sin sesión" en vez de tumbar el render de toda la página pública.
    if (err instanceof UserNotFoundError) return null;
    throw err;
  }
}

export async function PublicNav() {
  const session = await getSession();
  const sessionUser = await resolveSessionUser(session);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />

        <nav className="hidden items-center gap-6 md:flex">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          {sessionUser ? (
            <UserNavMenu name={sessionUser.profile.name} role={sessionUser.role} />
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline" })}
            >
              Login
            </Link>
          )}
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" />}
            className="md:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">Abrir menú</span>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              {PUBLIC_NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={<Link href={link.href} />}
                  nativeButton={false}
                  className="text-sm font-medium text-foreground"
                >
                  {link.label}
                </SheetClose>
              ))}
              {sessionUser ? (
                <>
                  <SheetClose
                    render={
                      <Link
                        href={
                          sessionUser.role === "PARTICIPANT"
                            ? "/home"
                            : "/admin/dashboard"
                        }
                      />
                    }
                    nativeButton={false}
                    className="text-sm font-medium text-foreground"
                  >
                    Inicio
                  </SheetClose>
                  <LogoutButton />
                </>
              ) : (
                <SheetClose
                  render={<Link href="/login" />}
                  nativeButton={false}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Login
                </SheetClose>
              )}
            </nav>

            {sessionUser && (
              <SheetFooter className="flex-row items-center justify-end gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {sessionUser.profile.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {sessionUser.profile.name}
                </span>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
