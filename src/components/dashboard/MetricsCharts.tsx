"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AdminMetrics,
  GrowthByRange,
  GrowthRange,
} from "@/lib/server/metrics";

// --- User population donut with center label ---

export function UserPopulationChart({
  users,
}: {
  users: AdminMetrics["users"];
}) {
  const t = useTranslations("dashboard.metrics.userPopulation");
  const populationConfig = {
    active: { label: t("active"), color: "var(--chart-2)" },
    dormant: { label: t("dormant"), color: "var(--chart-3)" },
    neverCreated: { label: t("neverCreated"), color: "var(--chart-5)" },
  } satisfies ChartConfig;

  const dormant = Math.max(
    0,
    users.total - users.activeLastThirtyDays - users.neverCreatedProject
  );

  const data = [
    {
      name: "active",
      value: users.activeLastThirtyDays,
      fill: "var(--chart-2)",
    },
    { name: "dormant", value: dormant, fill: "var(--chart-3)" },
    {
      name: "neverCreated",
      value: users.neverCreatedProject,
      fill: "var(--chart-5)",
    },
  ].filter((d) => d.value > 0);

  if (users.total === 0) {
    return (
      <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        {t("noUsers")}
      </div>
    );
  }

  return (
    <ChartContainer
      config={populationConfig}
      className="mx-auto h-52 w-full max-w-xs"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0];
            const label =
              populationConfig[item.name as keyof typeof populationConfig]
                ?.label ?? String(item.name);
            const pct =
              users.total > 0
                ? Math.round((Number(item.value) / users.total) * 100)
                : 0;
            return (
              <div className="bg-card border-border/50 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.payload.fill }}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </div>
                <p className="mt-1 font-semibold tabular-nums">
                  {String(item.value)}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({pct}%)
                  </span>
                </p>
              </div>
            );
          }}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={56}
          outerRadius={80}
          strokeWidth={4}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 14}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {users.total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 4}
                      className="fill-muted-foreground text-xs"
                    >
                      {t("usersUnit")}
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

// --- Content overview bar ---

export function ContentOverviewChart({
  projects,
  shares,
  presets,
}: {
  projects: AdminMetrics["projects"];
  shares: AdminMetrics["shares"];
  presets: AdminMetrics["presets"];
}) {
  const t = useTranslations("dashboard.metrics.contentOverview");
  const contentConfig = {
    count: { label: t("count") },
    projects: { label: t("projects"), color: "var(--chart-1)" },
    shares: { label: t("shares"), color: "var(--chart-4)" },
    presets: { label: t("presets"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const data = [
    { key: "projects", count: projects.active, fill: "var(--chart-1)" },
    { key: "shares", count: shares.totalActive, fill: "var(--chart-4)" },
    { key: "presets", count: presets.total, fill: "var(--chart-3)" },
  ];

  return (
    <ChartContainer config={contentConfig} className="h-52 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="key"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          tickFormatter={(value) =>
            contentConfig[value as keyof typeof contentConfig]?.label ?? value
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          allowDecimals={false}
          width={24}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const count = payload[0]?.value ?? 0;
            const categoryLabel =
              contentConfig[label as keyof typeof contentConfig]?.label ??
              String(label);
            const fill = (payload[0]?.payload as { fill?: string })?.fill;
            return (
              <div className="bg-card border-border/50 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                <div className="flex items-center gap-1.5">
                  {fill ? (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: fill }}
                    />
                  ) : null}
                  <span className="text-muted-foreground">{categoryLabel}</span>
                </div>
                <p className="mt-1 font-semibold tabular-nums">
                  {String(count)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={4}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// --- User growth area chart ---

// --- Combined user growth chart ---
// Cumulative total as area (primary), weekly new users as bars (secondary, same axis).
// Both share one Y-axis; bars are naturally small relative to cumulative total.

const GROWTH_RANGE_VALUES: GrowthRange[] = ["3m", "6m", "1y"];

function UserGrowthComboChart({
  userGrowth,
  userGrowthCumulative,
}: {
  userGrowth: GrowthByRange["3m"]["userGrowth"];
  userGrowthCumulative: GrowthByRange["3m"]["userGrowthCumulative"];
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const growthComboConfig = {
    totalUsers: { label: t("totalUsers"), color: "var(--chart-1)" },
    newUsers: { label: t("newThisWeek"), color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const data = userGrowth.map((row, i) => ({
    week: row.week,
    newUsers: row.users,
    totalUsers: userGrowthCumulative[i]?.users ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <ChartContainer config={growthComboConfig} className="h-52 w-full">
      <ComposedChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
      >
        <defs>
          <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-totalUsers)"
              stopOpacity={0.2}
            />
            <stop
              offset="100%"
              stopColor="var(--color-totalUsers)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          allowDecimals={false}
          width={32}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const total = payload.find((p) => p.dataKey === "totalUsers");
            const newW = payload.find((p) => p.dataKey === "newUsers");
            return (
              <div className="bg-card border-border/50 min-w-36 rounded-lg border px-3 py-2 text-xs shadow-xl">
                <p className="text-muted-foreground mb-2 border-b pb-1.5 font-medium">
                  {label}
                </p>
                {total != null && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: "var(--chart-1)" }}
                      />
                      <span className="text-muted-foreground">
                        {t("totalUsers")}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {Number(total.value).toLocaleString()}
                    </span>
                  </div>
                )}
                {newW != null && (
                  <div className="mt-1 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-sm opacity-70"
                        style={{ backgroundColor: "var(--chart-2)" }}
                      />
                      <span className="text-muted-foreground">
                        {t("newThisWeek")}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      +{newW.value}
                    </span>
                  </div>
                )}
              </div>
            );
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="totalUsers"
          stroke="var(--color-totalUsers)"
          strokeWidth={2}
          fill="url(#growthAreaGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Bar
          dataKey="newUsers"
          fill="var(--color-newUsers)"
          fillOpacity={0.45}
          radius={[2, 2, 0, 0]}
          maxBarSize={24}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

export function UserGrowthCard({
  growthByRange,
}: {
  growthByRange: GrowthByRange;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const [range, setRange] = useState<GrowthRange>("3m");
  const { userGrowth, userGrowthCumulative } = growthByRange[range];

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-muted-foreground text-xs">{t("description")}</p>
        </div>
        <div className="shrink-0">
          <Select
            value={range}
            onValueChange={(v) => setRange(v as GrowthRange)}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROWTH_RANGE_VALUES.map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {t(`ranges.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pt-3">
        <UserGrowthComboChart
          userGrowth={userGrowth}
          userGrowthCumulative={userGrowthCumulative}
        />
      </div>
    </div>
  );
}

// --- Plan limit simulator ---

const MAX_SHOWN = 12;
const SLIDER_MAX = 20;

const SAFE_COLOR = "var(--chart-2)";
const AFFECTED_COLOR = "hsl(0 72% 51%)";

type DistRow = [number, number, number];

function buildHistogram(counts: number[]) {
  const freq: number[] = Array(MAX_SHOWN + 1).fill(0);
  for (const c of counts) {
    freq[Math.min(c, MAX_SHOWN)]++;
  }
  return freq.map((users, bucket) => ({
    label: bucket === MAX_SHOWN ? `${MAX_SHOWN}+` : String(bucket),
    bucket,
    users,
  }));
}

function ResourceCard({
  title,
  counts,
  limit,
  totalUsers,
  onLimitChange,
}: {
  title: string;
  counts: number[];
  limit: number;
  totalUsers: number;
  onLimitChange: (v: number) => void;
}) {
  const t = useTranslations("dashboard.metrics.planLimit");
  const distConfig = { users: { label: t("usersAxis") } } satisfies ChartConfig;
  const histogram = useMemo(
    () => buildHistogram(counts).filter((entry) => entry.bucket !== 0),
    [counts]
  );
  const affected = useMemo(
    () => counts.filter((c) => c > limit).length,
    [counts, limit]
  );
  const pct = totalUsers > 0 ? Math.round((affected / totalUsers) * 100) : 0;

  return (
    <div className="bg-card space-y-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <span
          className={`shrink-0 text-right text-xs font-semibold tabular-nums ${
            affected > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground"
          }`}
        >
          {t("affected", { affected, total: totalUsers })}
          <br />
          <span className="font-normal">{t("pctAffected", { pct })}</span>
        </span>
      </div>

      <ChartContainer config={distConfig} className="h-36 w-full">
        <BarChart
          data={histogram}
          margin={{ left: 0, right: 0, top: 2, bottom: 18 }}
          barCategoryGap="12%"
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9 }}
            tickMargin={4}
            label={{
              value: t("perUserAxis", { title }),
              position: "insideBottom",
              offset: -12,
              style: { fontSize: 9, fill: "var(--muted-foreground)" },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9 }}
            allowDecimals={false}
            width={28}
            label={{
              value: t("usersAxis"),
              angle: -90,
              position: "insideLeft",
              offset: 8,
              style: { fontSize: 9, fill: "var(--muted-foreground)" },
            }}
          />
          <ChartTooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const count = Number(payload[0]?.value ?? 0);
              const qualifier =
                label === `${MAX_SHOWN}+` ? "" : t("withExactly");
              const resource = title.toLowerCase();
              return (
                <div className="bg-card border-border/50 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="text-foreground font-semibold tabular-nums">
                    {t("usersCount", { count })}
                  </p>
                  <p className="text-muted-foreground">
                    {t("withCount", {
                      qualifier,
                      count: String(label ?? ""),
                      resource,
                    })}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="users" radius={[3, 3, 0, 0]}>
            {histogram.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={entry.bucket > limit ? AFFECTED_COLOR : SAFE_COLOR}
                fillOpacity={entry.bucket > limit ? 0.75 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            value={Math.min(limit, SLIDER_MAX)}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
            className="accent-foreground h-1.5 flex-1 cursor-pointer"
          />
          <input
            type="number"
            min={0}
            max={999}
            value={limit}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 0) onLimitChange(n);
            }}
            className="w-12 rounded-md border px-1.5 py-1 text-center text-xs tabular-nums"
          />
        </div>
        <p className="text-muted-foreground text-[10px]">
          {t("freeLimit", { limit })}{" "}
          <span className="text-rose-600 dark:text-rose-400">{t("red")}</span>{" "}
          {t("exceedIt")}
        </p>
      </div>
    </div>
  );
}

export function PlanLimitSimulator({
  userDistribution,
}: {
  userDistribution: DistRow[];
}) {
  const t = useTranslations("dashboard.metrics.planLimit");
  const [limits, setLimits] = useState({ projects: 5, shares: 5, presets: 5 });

  const activeDistribution = useMemo(
    () => userDistribution.filter(([p, s, pr]) => p > 0 || s > 0 || pr > 0),
    [userDistribution]
  );
  const totalUsers = activeDistribution.length;
  const excludedCount = userDistribution.length - totalUsers;

  const projCounts = useMemo(
    () => activeDistribution.map((r) => r[0]),
    [activeDistribution]
  );
  const shareCounts = useMemo(
    () => activeDistribution.map((r) => r[1]),
    [activeDistribution]
  );
  const presetCounts = useMemo(
    () => activeDistribution.map((r) => r[2]),
    [activeDistribution]
  );

  const anyAffected = useMemo(
    () =>
      activeDistribution.filter(
        ([p, s, pr]) =>
          p > limits.projects || s > limits.shares || pr > limits.presets
      ).length,
    [activeDistribution, limits]
  );

  const anyPct =
    totalUsers > 0 ? Math.round((anyAffected / totalUsers) * 100) : 0;

  if (userDistribution.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <ResourceCard
          title={t("projects")}
          counts={projCounts}
          limit={limits.projects}
          totalUsers={totalUsers}
          onLimitChange={(v) => setLimits((prev) => ({ ...prev, projects: v }))}
        />
        <ResourceCard
          title={t("shareLinks")}
          counts={shareCounts}
          limit={limits.shares}
          totalUsers={totalUsers}
          onLimitChange={(v) => setLimits((prev) => ({ ...prev, shares: v }))}
        />
        <ResourceCard
          title={t("presets")}
          counts={presetCounts}
          limit={limits.presets}
          totalUsers={totalUsers}
          onLimitChange={(v) => setLimits((prev) => ({ ...prev, presets: v }))}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <div>
          <p className="text-sm font-medium">{t("totalImpact")}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("totalImpactDescription")}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-xl font-bold tabular-nums ${
              anyAffected > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            }`}
          >
            {anyAffected}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {t("pctOfUsers", { pct: anyPct, total: totalUsers })}
            {excludedCount > 0
              ? t("excludedAccounts", { count: excludedCount })
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
