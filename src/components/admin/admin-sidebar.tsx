"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { ADMIN_NAV_LINKS } from "@/lib/nav-links";
import { cn } from "@/lib/utils";

export function AdminSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ADMIN_NAV_LINKS.filter(
    (link) => !link.roles || link.roles.includes(role),
  );

  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border p-4 md:flex">
      {links.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
