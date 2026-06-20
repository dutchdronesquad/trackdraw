"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminMetrics } from "@/lib/server/metrics";

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
          content={<ChartTooltipContent nameKey="name" hideLabel />}
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
          content={<ChartTooltipContent labelKey="key" />}
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

const growthConfig = {
  users: { label: "New users", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function UserGrowthChart({
  userGrowth,
}: {
  userGrowth: AdminMetrics["userGrowth"];
}) {
  if (userGrowth.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        No data yet
      </div>
    );
  }

  return (
    <ChartContainer config={growthConfig} className="h-40 w-full">
      <AreaChart
        accessibilityLayer
        data={userGrowth}
        margin={{ left: 4, right: 4 }}
      >
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-users)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-users)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          allowDecimals={false}
          width={24}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          type="natural"
          dataKey="users"
          stroke="var(--color-users)"
          strokeWidth={2}
          fill="url(#growthGradient)"
          fillOpacity={0.4}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// --- Plan limit grouped bar chart ---

const planLimitConfig = {
  usersExceedingProjects: { label: "Projects", color: "var(--chart-1)" },
  usersExceedingShares: { label: "Shares", color: "var(--chart-4)" },
  usersExceedingPresets: { label: "Presets", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function PlanLimitChart({
  planLimits,
}: {
  planLimits: AdminMetrics["planLimits"];
}) {
  const data = planLimits.map((row) => ({
    limit: `max ${row.limit}`,
    usersExceedingProjects: row.usersExceedingProjects,
    usersExceedingShares: row.usersExceedingShares,
    usersExceedingPresets: row.usersExceedingPresets,
  }));

  return (
    <ChartContainer config={planLimitConfig} className="h-52 w-full">
      <BarChart
        accessibilityLayer
        data={data}
        barCategoryGap="30%"
        barGap={3}
        margin={{ left: 4, right: 4 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="limit"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dashed" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="usersExceedingProjects"
          fill="var(--color-usersExceedingProjects)"
          radius={4}
        />
        <Bar
          dataKey="usersExceedingShares"
          fill="var(--color-usersExceedingShares)"
          radius={4}
        />
        <Bar
          dataKey="usersExceedingPresets"
          fill="var(--color-usersExceedingPresets)"
          radius={4}
        />
      </BarChart>
    </ChartContainer>
  );
}
