"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Role } from "@prisma/client";
import { ADMIN_NAV_LINKS } from "@/lib/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AdminMobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ADMIN_NAV_LINKS.filter(
    (link) => !link.roles || link.roles.includes(role),
  );

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" />}
        className="md:hidden"
      >
        <Menu className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <SheetClose
                key={link.href}
                render={<Link href={link.href} />}
                nativeButton={false}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
