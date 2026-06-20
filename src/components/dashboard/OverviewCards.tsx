import { EyeOff, ImageIcon, Sparkles, Users } from "lucide-react";
import type { GalleryOverviewStats } from "@/lib/server/gallery";

type DashboardOverviewCardsProps = {
  galleryStats: GalleryOverviewStats;
  totalUsers: number | null;
};

type KpiCard = {
  key: string;
  label: string;
  value: number;
  helper: string;
  icon: typeof ImageIcon;
  accent: string;
  iconTone: string;
};

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  accent,
  iconTone,
}: KpiCard) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className={`h-1 ${accent}`} />
      <div className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs font-medium">
            {label}
          </p>
          <p className="text-2xl leading-tight font-bold tabular-nums">
            {value}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">{helper}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverviewCards({
  galleryStats,
  totalUsers,
}: DashboardOverviewCardsProps) {
  const cards: KpiCard[] = [
    {
      key: "gallery-total",
      label: "Gallery entries",
      value: galleryStats.total,
      helper: "All dashboard-managed entries",
      icon: ImageIcon,
      accent: "bg-sky-500",
      iconTone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      key: "gallery-featured",
      label: "Featured",
      value: galleryStats.featured,
      helper: "Pinned in the featured section",
      icon: Sparkles,
      accent: "bg-amber-500",
      iconTone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      key: "gallery-hidden",
      label: "Hidden",
      value: galleryStats.hidden,
      helper: "Removed from public discovery",
      icon: EyeOff,
      accent: "bg-rose-500",
      iconTone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    ...(totalUsers !== null
      ? [
          {
            key: "accounts",
            label: "Total accounts",
            value: totalUsers,
            helper: "Tracked user records",
            icon: Users,
            accent: "bg-emerald-500",
            iconTone:
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          } satisfies KpiCard,
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ key, ...card }) => (
        <KpiCard key={key} {...card} />
      ))}
    </div>
  );
}
