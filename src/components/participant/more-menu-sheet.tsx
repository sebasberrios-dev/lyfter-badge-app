"use client";

import Link from "next/link";
import { MoreHorizontal, User } from "lucide-react";
import { LogoutButton } from "@/components/shared/logout-button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MoreMenuSheet() {
  return (
    <Sheet>
      <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <MoreHorizontal className="size-5" />
        Más
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Más</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 px-4 pb-4">
          <SheetClose
            render={<Link href="/profile" />}
            nativeButton={false}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <User className="size-4" />
            Perfil
          </SheetClose>
          <LogoutButton />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
