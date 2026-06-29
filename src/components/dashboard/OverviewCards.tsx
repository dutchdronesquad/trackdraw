import { EyeOff, ImageIcon, Sparkles, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import type { GalleryOverviewStats } from "@/lib/server/gallery";

type DashboardOverviewCardsProps = {
  galleryStats: GalleryOverviewStats;
  totalUsers: number | null;
};

type KpiCardProps = {
  label: string;
  value: number;
  helper: string;
  icon: typeof ImageIcon;
  accent: string;
  iconTone: string;
};

type KpiCardConfig = KpiCardProps & {
  key: string;
};

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  accent,
  iconTone,
}: KpiCardProps) {
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

export default async function DashboardOverviewCards({
  galleryStats,
  totalUsers,
}: DashboardOverviewCardsProps) {
  const t = await getTranslations("dashboard.overviewCards");

  const cards: KpiCardConfig[] = [
    {
      key: "gallery-total",
      label: t("cards.galleryEntries.label"),
      value: galleryStats.total,
      helper: t("cards.galleryEntries.helper"),
      icon: ImageIcon,
      accent: "bg-sky-500",
      iconTone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      key: "gallery-featured",
      label: t("cards.featured.label"),
      value: galleryStats.featured,
      helper: t("cards.featured.helper"),
      icon: Sparkles,
      accent: "bg-amber-500",
      iconTone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      key: "gallery-hidden",
      label: t("cards.hidden.label"),
      value: galleryStats.hidden,
      helper: t("cards.hidden.helper"),
      icon: EyeOff,
      accent: "bg-rose-500",
      iconTone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    ...(totalUsers !== null
      ? [
          {
            key: "accounts",
            label: t("cards.totalAccounts.label"),
            value: totalUsers,
            helper: t("cards.totalAccounts.helper"),
            icon: Users,
            accent: "bg-emerald-500",
            iconTone:
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          } satisfies KpiCardConfig,
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ key, ...card }, index) => (
        <Reveal key={key} delay={index * 0.04}>
          <KpiCard {...card} />
        </Reveal>
      ))}
    </div>
  );
}
