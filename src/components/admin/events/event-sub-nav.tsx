"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function EventSubNav({ eventId }: { eventId: number }) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}`;
  const links = [
    { href: base, label: "Detalle" },
    { href: `${base}/badges`, label: "Badges" },
    { href: `${base}/participants`, label: "Participantes" },
    { href: `${base}/metrics`, label: "Métricas" },
  ];

  return (
    <nav className="flex gap-1 border-b border-border">
      {links.map((link) => {
        const active =
          link.href === base
            ? pathname === base
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
