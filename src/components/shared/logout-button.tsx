"use client";

import { LogOut } from "lucide-react";
import { useLogout } from "@/hooks/use-logout";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const logout = useLogout();

  return (
    <button
      type="button"
      onClick={logout}
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium text-destructive",
        className,
      )}
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </button>
  );
}
