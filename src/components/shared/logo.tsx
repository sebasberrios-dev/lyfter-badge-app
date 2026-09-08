import Link from "next/link";
import { Award } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Award className="size-5" />
      </span>
      <span className="font-semibold text-foreground">Lyfter Badge App</span>
    </Link>
  );
}
