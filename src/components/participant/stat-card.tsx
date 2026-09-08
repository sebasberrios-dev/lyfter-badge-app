import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
};

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon className="size-4.5" />
          </span>
        )}
        <div>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
