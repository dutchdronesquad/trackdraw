import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DashboardTone =
  "neutral" | "sky" | "emerald" | "amber" | "rose" | "violet" | "destructive";

export const dashboardToneClassNames: Record<DashboardTone, string> = {
  neutral: "border-border bg-muted/50 text-muted-foreground",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  emerald:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  violet:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
};

export default function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: DashboardTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0", dashboardToneClassNames[tone], className)}
    >
      {children}
    </Badge>
  );
}
