"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ShareBadgeButtonsProps = {
  badgeId: number;
  badgeName: string;
  size?: "default" | "sm";
};

export function ShareBadgeButtons({ badgeId, badgeName, size = "default" }: ShareBadgeButtonsProps) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    if (typeof window === "undefined") return `/badge/${badgeId}`;
    return `${window.location.origin}/badge/${badgeId}`;
  }

  function getText() {
    return `¡Gané el badge "${badgeName}" en Lyfter Badge App!`;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size }))}>
        <Share2 /> Compartir
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLinkItem
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(getUrl())}&text=${encodeURIComponent(getText())}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          X (Twitter)
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem
          href={`https://wa.me/?text=${encodeURIComponent(`${getText()} ${getUrl()}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getUrl())}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopy} closeOnClick={false}>
          {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
