"use client";

import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import type { Role } from "@prisma/client";
import { useLogout } from "@/hooks/use-logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserNavMenuProps {
  name: string;
  role: Role;
}

export function UserNavMenu({ name, role }: UserNavMenuProps) {
  const logout = useLogout();
  const homeHref = role === "PARTICIPANT" ? "/home" : "/admin/dashboard";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{name}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLinkItem render={<Link href={homeHref} />} closeOnClick>
          Inicio
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
