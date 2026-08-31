"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanQrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTICIPANT_TAB_LINKS } from "@/lib/nav-links";

export function BottomTabBar() {
  const pathname = usePathname();

  function renderLink(link: (typeof PARTICIPANT_TAB_LINKS)[number]) {
    const isActive = pathname.startsWith(link.href);
    const Icon = link.icon;

    return (
      <Link
        key={link.href}
        href={link.href}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-5" />
        {link.label}
      </Link>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-border bg-card">
      {PARTICIPANT_TAB_LINKS.slice(0, 2).map(renderLink)}
      <Link
        href="/scan"
        className="flex flex-1 flex-col items-center justify-center pb-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card">
          <ScanQrCode className="size-6" />
        </span>
      </Link>
      {PARTICIPANT_TAB_LINKS.slice(2).map(renderLink)}
    </nav>
  );
}
