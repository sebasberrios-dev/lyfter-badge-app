"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
};

export function PaginationControls({
  page,
  pageSize,
  total,
}: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  function hrefForPage(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        Página {page} de {totalPages} ({total} en total)
      </span>
      <div className="flex gap-2">
        <Link
          href={hrefForPage(page - 1)}
          aria-disabled={page <= 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          Anterior
        </Link>
        <Link
          href={hrefForPage(page + 1)}
          aria-disabled={page >= totalPages}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= totalPages && "pointer-events-none opacity-50",
          )}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}
