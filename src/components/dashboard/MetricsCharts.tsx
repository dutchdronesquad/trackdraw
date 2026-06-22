"use client";

import { useMemo, useState } from "react";
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

const populationConfig = {
  active: { label: "Active (30d)", color: "var(--chart-2)" },
  dormant: { label: "Dormant", color: "var(--chart-3)" },
  neverCreated: { label: "Never created", color: "var(--chart-5)" },
} satisfies ChartConfig;

export function UserPopulationChart({
  users,
}: {
  users: AdminMetrics["users"];
}) {
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
        No users yet
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
                      users
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

const contentConfig = {
  count: { label: "Count" },
  projects: { label: "Active projects", color: "var(--chart-1)" },
  shares: { label: "Active shares", color: "var(--chart-4)" },
  presets: { label: "Presets", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ContentOverviewChart({
  projects,
  shares,
  presets,
}: {
  projects: AdminMetrics["projects"];
  shares: AdminMetrics["shares"];
  presets: AdminMetrics["presets"];
}) {
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

const GROWTH_RANGES: { value: GrowthRange; label: string }[] = [
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
];

const growthComboConfig = {
  totalUsers: { label: "Total users", color: "var(--chart-1)" },
  newUsers: { label: "New this week", color: "var(--chart-2)" },
} satisfies ChartConfig;

function UserGrowthComboChart({
  userGrowth,
  userGrowthCumulative,
}: {
  userGrowth: GrowthByRange["3m"]["userGrowth"];
  userGrowthCumulative: GrowthByRange["3m"]["userGrowthCumulative"];
}) {
  const data = userGrowth.map((row, i) => ({
    week: row.week,
    newUsers: row.users,
    totalUsers: userGrowthCumulative[i]?.users ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        No data yet
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
                      <span className="text-muted-foreground">Total users</span>
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
                        New this week
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
  const [range, setRange] = useState<GrowthRange>("3m");
  const { userGrowth, userGrowthCumulative } = growthByRange[range];

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">User growth</p>
          <p className="text-muted-foreground text-xs">
            Cumulative user count (area) and new registrations per week (bars).
          </p>
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
              {GROWTH_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
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

const distConfig = { users: { label: "Users" } } satisfies ChartConfig;

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
  const histogram = useMemo(() => buildHistogram(counts), [counts]);
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
          {affected} / {totalUsers}
          <br />
          <span className="font-normal">{pct}% affected</span>
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
              value: `${title.toLowerCase()} per user`,
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
              value: "users",
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
              const count = payload[0]?.value ?? 0;
              const qualifier = label === `${MAX_SHOWN}+` ? "" : "exactly ";
              const resource = title.toLowerCase();
              return (
                <div className="bg-card border-border/50 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="text-foreground font-semibold tabular-nums">
                    {count} {count === 1 ? "user" : "users"}
                  </p>
                  <p className="text-muted-foreground">
                    with {qualifier}
                    {label} {resource}
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
          Free limit: max {limit} · bars in{" "}
          <span className="text-rose-600 dark:text-rose-400">red</span> exceed
          it
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
        No user data yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <ResourceCard
          title="Projects"
          counts={projCounts}
          limit={limits.projects}
          totalUsers={totalUsers}
          onLimitChange={(v) => setLimits((prev) => ({ ...prev, projects: v }))}
        />
        <ResourceCard
          title="Share links"
          counts={shareCounts}
          limit={limits.shares}
          totalUsers={totalUsers}
          onLimitChange={(v) => setLimits((prev) => ({ ...prev, shares: v }))}
        />
        <ResourceCard
          title="Presets"
          counts={presetCounts}
          limit={limits.presets}
          totalUsers={totalUsers}
          onLimitChange={(v) => setLimits((prev) => ({ ...prev, presets: v }))}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Total impact</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Unique users affected by at least one of the limits above
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
            {anyPct}% of {totalUsers} users with content
            {excludedCount > 0
              ? ` · ${excludedCount} empty accounts excluded`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
