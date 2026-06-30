import type { LucideIcon } from "lucide-react";

type DashboardPageIntroProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
};

export default function DashboardPageIntro({
  icon: Icon,
  title,
  description,
  accent,
}: DashboardPageIntroProps) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div>
        <h1 className="text-lg leading-tight font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
