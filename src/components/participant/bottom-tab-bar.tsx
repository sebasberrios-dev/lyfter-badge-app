"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PARTICIPANT_TAB_LINKS } from "@/lib/nav-links";
import { MoreMenuSheet } from "@/components/participant/more-menu-sheet";

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card">
      {PARTICIPANT_TAB_LINKS.map((link) => {
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
      })}
      <MoreMenuSheet />
    </nav>
  );
}
