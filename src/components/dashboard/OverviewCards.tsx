import { EyeOff, ImageIcon, Sparkles, Users } from "lucide-react";
import type { GalleryOverviewStats } from "@/lib/server/gallery";

type DashboardOverviewCardsProps = {
  galleryStats: GalleryOverviewStats;
  totalUsers: number | null;
};

type OverviewCard = {
  key: string;
  label: string;
  value: number;
  helper: string;
  icon: typeof ImageIcon;
  tone: string;
};

function OverviewStatsGrid({ cards }: { cards: OverviewCard[] }) {
  return (
    <div className="grid auto-rows-min grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.key} className="bg-muted/50 rounded-lg p-3 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-muted-foreground truncate text-xs sm:text-sm">
                {card.label}
              </p>
              <span
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md ${card.tone}`}
              >
                <Icon className="size-3.5" />
              </span>
            </div>
            <p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">
              {card.value}
            </p>
            <p className="text-muted-foreground mt-0.5 hidden text-xs sm:mt-1 sm:block">
              {card.helper}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardOverviewCards({
  galleryStats,
  totalUsers,
}: DashboardOverviewCardsProps) {
  const galleryCards = [
    {
      key: "gallery-total",
      label: "Gallery entries",
      value: galleryStats.total,
      helper: "All dashboard-managed entries",
      icon: ImageIcon,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      key: "gallery-featured",
      label: "Featured",
      value: galleryStats.featured,
      helper: "Pinned in the featured section",
      icon: Sparkles,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      key: "gallery-hidden",
      label: "Hidden",
      value: galleryStats.hidden,
      helper: "Removed from public discovery",
      icon: EyeOff,
      tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  ];

  const accountCards =
    totalUsers !== null
      ? [
          {
            key: "accounts",
            label: "Total accounts",
            value: totalUsers,
            helper: "Tracked user records",
            icon: Users,
            tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
        ]
      : [];

  return (
    <div className="space-y-4">
      <OverviewStatsGrid cards={galleryCards} />

      {accountCards.length > 0 ? (
        <OverviewStatsGrid cards={accountCards} />
      ) : null}
    </div>
  );
}
