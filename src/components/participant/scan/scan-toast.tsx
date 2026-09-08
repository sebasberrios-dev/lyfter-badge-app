"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeIconGlyph } from "@/components/shared/badge-icon-glyph";
import { cn } from "@/lib/utils";
import type { RedeemBadgeResult } from "@/modules/redemptions/redemptions.service";

export type ScanOutcome =
  | { status: "success"; data: Extract<RedeemBadgeResult, { alreadyRedeemed: false }> }
  | { status: "already-redeemed"; data: Extract<RedeemBadgeResult, { alreadyRedeemed: true }> }
  | { status: "error"; message: string };

type ScanToastProps = {
  result: ScanOutcome;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 4000;

export function ScanToast({ result, onDismiss }: ScanToastProps) {
  const [visible, setVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    const timeout = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [result]);

  return (
    <div
      role="status"
      onClick={onDismiss}
      className={cn(
        "fixed inset-x-4 bottom-24 z-50 flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-4 shadow-xl ring-1 ring-foreground/10 transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
      )}
    >
      {result.status === "error" ? (
        <div>
          <p className="text-xs font-bold tracking-wide text-destructive">
            NO SE PUDO RECLAMAR
          </p>
          <p className="text-sm text-muted-foreground">{result.message}</p>
        </div>
      ) : (
        <>
          <BadgeIconGlyph icon={result.data.badge.icon} rarity={result.data.badge.rarity} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs font-bold tracking-wide",
                result.status === "success" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {result.status === "success" ? "¡BADGE DESBLOQUEADO!" : "YA TENÉS ESTE BADGE"}
            </p>
            <p className="truncate font-semibold text-foreground">{result.data.badge.name}</p>
            {result.status === "success" && (
              <p className="text-sm text-primary">
                +{result.data.xpAwarded} XP
                {result.data.leveledUp && ` · ¡Nivel ${result.data.level.level}!`}
              </p>
            )}
            {result.status === "success" && result.data.eventCompleted && (
              <p className="mt-2 rounded-lg bg-primary/10 p-2 text-sm text-foreground">
                🏆 ¡Completaste el evento! {result.data.prizeDescription}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
