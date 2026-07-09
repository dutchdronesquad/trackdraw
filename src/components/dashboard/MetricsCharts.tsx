"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
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
import { Button } from "@/components/ui/button";
import { MetricsRangeCalendar } from "@/components/dashboard/MetricsRangeCalendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildCustomGrowthData,
  formatCalendarDateKey,
  formatShortDashboardDate,
  parseCalendarDateKey,
  type GrowthCustomRange,
  type GrowthData,
  type GrowthPresetRange,
  type GrowthRange,
  type GrowthTimeline,
} from "@/lib/metrics-growth";
import type { AdminMetrics, GrowthByRange } from "@/lib/server/metrics";

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
      <div className="text-muted-foreground flex h-48 items-center justify-center text-sm sm:h-52">
        {t("noUsers")}
      </div>
    );
  }

  return (
    <ChartContainer
      config={populationConfig}
      className="mx-auto h-48 w-full max-w-[16rem] sm:h-52 sm:max-w-xs"
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
    <ChartContainer config={contentConfig} className="h-48 w-full sm:h-52">
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

const GROWTH_RANGE_VALUES: GrowthPresetRange[] = [
  "3m",
  "6m",
  "12m",
  "ytd",
  "previousYear",
];

function startOfCalendarMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function UserGrowthComboChart({
  growthData,
  newUsersLabel,
}: {
  growthData: GrowthData;
  newUsersLabel: string;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const { userGrowth, userGrowthCumulative } = growthData;
  const growthComboConfig = {
    totalUsers: { label: t("totalUsers"), color: "var(--chart-1)" },
    newUsers: { label: newUsersLabel, color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const data = userGrowth.map((row, i) => ({
    label: row.label,
    period: row.period,
    newUsers: row.users,
    totalUsers: userGrowthCumulative[i]?.users ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center text-sm sm:h-52">
        {t("noData")}
      </div>
    );
  }

  return (
    <ChartContainer config={growthComboConfig} className="h-48 w-full sm:h-52">
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
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={10}
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
                        {newUsersLabel}
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

function UserGrowthSummary({ growthData }: { growthData: GrowthData }) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const periodName = t(`periods.${growthData.bucket}`);
  const totalNewUsers = growthData.userGrowth.reduce(
    (sum, row) => sum + row.users,
    0
  );
  const averagePerPeriod =
    growthData.userGrowth.length > 0
      ? Math.round((totalNewUsers / growthData.userGrowth.length) * 10) / 10
      : 0;
  const strongestPeriod = growthData.userGrowth.reduce<
    GrowthData["userGrowth"][number] | null
  >((best, row) => {
    if (best == null || row.users > best.users) return row;
    return best;
  }, null);

  return (
    <div className="grid grid-cols-3 items-start border-t pt-3">
      <div className="min-w-0 pr-2 text-left">
        <p className="text-muted-foreground truncate text-[11px] sm:text-xs">
          {t("summary.newInRange")}
        </p>
        <p className="text-sm font-semibold tabular-nums">+{totalNewUsers}</p>
      </div>
      <div className="min-w-0 px-2 text-center">
        <p className="text-muted-foreground truncate text-[11px] sm:text-xs">
          {t("summary.avgPerPeriod", { period: periodName })}
        </p>
        <p className="text-sm font-semibold tabular-nums">
          {averagePerPeriod.toLocaleString()}
        </p>
      </div>
      <div className="min-w-0 pl-2 text-right">
        <p className="text-muted-foreground truncate text-[11px] sm:text-xs">
          {t("summary.strongestPeriod", { period: periodName })}
        </p>
        <p className="truncate text-sm font-semibold tabular-nums">
          {strongestPeriod
            ? t("summary.strongestValue", {
                label: strongestPeriod.label,
                count: strongestPeriod.users,
              })
            : t("summary.noPeriod")}
        </p>
      </div>
    </div>
  );
}

function normalizeDraftRange(range: DateRange | undefined) {
  if (!range?.from) return null;
  const from = range.from;
  const to = range.to ?? range.from;
  const orderedFrom = from <= to ? from : to;
  const orderedTo = from <= to ? to : from;
  return {
    from: formatCalendarDateKey(orderedFrom),
    to: formatCalendarDateKey(orderedTo),
  } satisfies GrowthCustomRange;
}

function getDraftRangeFromCustomRange(
  range: GrowthCustomRange | null
): DateRange | undefined {
  if (!range) return undefined;
  return {
    from: parseCalendarDateKey(range.from),
    to: parseCalendarDateKey(range.to),
  };
}

function getGrowthRangeLabel(
  range: GrowthRange,
  today: string,
  t: ReturnType<typeof useTranslations>
) {
  if (range === "custom") return t("picker.custom");
  if (range === "previousYear") {
    return String(parseCalendarDateKey(today).getFullYear() - 1);
  }
  return t(`ranges.${range}`);
}

function RangePickerTrigger({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="border-input bg-background hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent h-9 w-auto max-w-[9.5rem] justify-start gap-2 rounded-lg border px-2.5 text-left font-normal shadow-xs sm:w-56 sm:max-w-none"
    >
      <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-[10px] leading-none font-medium uppercase">
          {t("picker.range")}
        </span>
        <span className="block truncate text-xs leading-snug">{label}</span>
      </span>
    </Button>
  );
}

function RangePickerContent({
  activeRange,
  draftRange,
  normalizedDraft,
  today,
  todayDate,
  numberOfMonths,
  variant = "desktop",
  onDraftRangeChange,
  onPresetSelect,
  onApply,
}: {
  activeRange: GrowthRange;
  draftRange: DateRange | undefined;
  normalizedDraft: GrowthCustomRange | null;
  today: string;
  todayDate: Date;
  numberOfMonths: 1 | 2;
  variant?: "desktop" | "mobile";
  onDraftRangeChange: (range: DateRange | undefined) => void;
  onPresetSelect: (range: GrowthPresetRange) => void;
  onApply: () => void;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const touchStartX = useRef<number | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    startOfCalendarMonth(draftRange?.from ?? todayDate)
  );
  const customRangeLabel = normalizedDraft
    ? `${formatShortDashboardDate(normalizedDraft.from)} - ${formatShortDashboardDate(normalizedDraft.to)}`
    : t("picker.customPlaceholder");
  const todayMonth = startOfCalendarMonth(todayDate);
  const changeVisibleMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const next = addCalendarMonths(current, offset);
      return next > todayMonth ? todayMonth : next;
    });
  };

  if (variant === "mobile") {
    return (
      <div className="bg-card flex max-h-[calc(90dvh-3.5rem)] flex-col">
        <div className="border-border/60 border-b px-4 pt-2 pb-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium">
            {t("picker.presets")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {GROWTH_RANGE_VALUES.map((value) => (
              <Button
                key={value}
                type="button"
                variant={activeRange === value ? "secondary" : "ghost"}
                size="sm"
                className="border-border/60 h-9 justify-start rounded-lg border px-2.5 text-xs"
                onClick={() => onPresetSelect(value)}
              >
                {getGrowthRangeLabel(value, today, t)}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-popover min-h-0 flex-1 overflow-y-auto">
          <div className="bg-card/96 border-border/60 border-b px-4 py-2.5">
            <p className="text-xs font-medium">{t("picker.custom")}</p>
            <p className="text-muted-foreground truncate text-xs">
              {customRangeLabel}
            </p>
          </div>
          <div
            className="bg-popover overflow-hidden px-4 py-2"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current == null) return;
              const endX =
                event.changedTouches[0]?.clientX ?? touchStartX.current;
              const deltaX = endX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(deltaX) < 48) return;
              changeVisibleMonth(deltaX < 0 ? 1 : -1);
            }}
          >
            <MetricsRangeCalendar
              className="bg-popover w-full p-0"
              classNames={{
                root: "w-full",
                months: "relative flex w-full flex-col",
                month: "flex w-full flex-col gap-3",
                month_grid: "w-full border-collapse",
                weekdays: "flex w-full",
                weekday:
                  "text-muted-foreground flex h-8 flex-1 select-none items-center justify-center rounded-md text-[0.8rem] font-normal",
                week: "mt-1 flex w-full",
                day: "group/day relative !size-auto aspect-square flex-1 select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
                day_button: "!size-full !min-w-0",
                month_caption:
                  "flex h-8 w-full items-center justify-center px-8",
              }}
              mode="range"
              numberOfMonths={numberOfMonths}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              selected={draftRange}
              onSelect={onDraftRangeChange}
              disabled={{ after: todayDate }}
              endMonth={todayDate}
            />
          </div>
        </div>

        <div className="border-border/60 bg-card border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full"
            disabled={!normalizedDraft}
            onClick={onApply}
          >
            {t("picker.apply")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-[11.5rem_1fr]">
      <div className="space-y-2 border-b p-3 sm:border-r sm:border-b-0">
        <p className="text-muted-foreground text-xs font-medium">
          {t("picker.presets")}
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
          {GROWTH_RANGE_VALUES.map((value) => (
            <Button
              key={value}
              type="button"
              variant={activeRange === value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 justify-start px-2 text-xs"
              onClick={() => onPresetSelect(value)}
            >
              {getGrowthRangeLabel(value, today, t)}
            </Button>
          ))}
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">{t("picker.custom")}</p>
            <p className="text-muted-foreground truncate text-xs">
              {customRangeLabel}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!normalizedDraft}
            onClick={onApply}
          >
            {t("picker.apply")}
          </Button>
        </div>
        <MetricsRangeCalendar
          className="mx-auto p-3"
          mode="range"
          numberOfMonths={numberOfMonths}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          selected={draftRange}
          onSelect={onDraftRangeChange}
          disabled={{ after: todayDate }}
          endMonth={todayDate}
        />
      </div>
    </div>
  );
}

function UserGrowthRangePicker({
  activeRange,
  customRange,
  today,
  onPresetSelect,
  onCustomApply,
}: {
  activeRange: GrowthRange;
  customRange: GrowthCustomRange | null;
  today: string;
  onPresetSelect: (range: GrowthPresetRange) => void;
  onCustomApply: (range: GrowthCustomRange) => void;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    getDraftRangeFromCustomRange(customRange)
  );
  const todayDate = parseCalendarDateKey(today);
  const normalizedDraft = normalizeDraftRange(draftRange);
  const triggerLabel =
    activeRange === "custom" && customRange
      ? `${formatShortDashboardDate(customRange.from)} - ${formatShortDashboardDate(customRange.to)}`
      : getGrowthRangeLabel(activeRange, today, t);

  const resetDraft = () =>
    setDraftRange(getDraftRangeFromCustomRange(customRange));
  const applyCustomRange = () => {
    if (!normalizedDraft) return;
    onCustomApply(normalizedDraft);
    setOpen(false);
    setDrawerOpen(false);
  };

  return (
    <>
      <div className="sm:hidden">
        <Drawer
          open={drawerOpen}
          direction="bottom"
          modal
          onOpenChange={(nextOpen) => {
            if (nextOpen) resetDraft();
            setDrawerOpen(nextOpen);
          }}
        >
          <RangePickerTrigger
            label={triggerLabel}
            onClick={() => {
              resetDraft();
              setDrawerOpen(true);
            }}
          />
          <DrawerContent className="border-border/60 bg-card gap-0 overflow-hidden rounded-t-[1.25rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
            <DrawerHeader className="border-border/60 bg-card/96 border-b px-4 pt-3 pb-3 text-left backdrop-blur-xs">
              <DrawerTitle className="text-sm">{t("picker.range")}</DrawerTitle>
            </DrawerHeader>
            <RangePickerContent
              activeRange={activeRange}
              draftRange={draftRange}
              normalizedDraft={normalizedDraft}
              today={today}
              todayDate={todayDate}
              numberOfMonths={1}
              variant="mobile"
              onDraftRangeChange={setDraftRange}
              onPresetSelect={(value) => {
                onPresetSelect(value);
                setDrawerOpen(false);
              }}
              onApply={applyCustomRange}
            />
          </DrawerContent>
        </Drawer>
      </div>

      <div className="hidden sm:block">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) resetDraft();
            setOpen(nextOpen);
          }}
        >
          <PopoverTrigger asChild>
            <RangePickerTrigger label={triggerLabel} />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="bg-popover w-max max-w-[calc(100vw-2rem)] overflow-hidden p-0"
          >
            <RangePickerContent
              activeRange={activeRange}
              draftRange={draftRange}
              normalizedDraft={normalizedDraft}
              today={today}
              todayDate={todayDate}
              numberOfMonths={2}
              onDraftRangeChange={setDraftRange}
              onPresetSelect={(value) => {
                onPresetSelect(value);
                setOpen(false);
              }}
              onApply={applyCustomRange}
            />
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

export function UserGrowthCard({
  growthByRange,
  growthTimeline,
}: {
  growthByRange: GrowthByRange;
  growthTimeline: GrowthTimeline;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const [range, setRange] = useState<GrowthRange>("3m");
  const [customRange, setCustomRange] = useState<GrowthCustomRange | null>(
    null
  );
  const customGrowthData = useMemo(
    () =>
      customRange ? buildCustomGrowthData(growthTimeline, customRange) : null,
    [customRange, growthTimeline]
  );
  const growthData =
    range === "custom"
      ? (customGrowthData ?? growthByRange["3m"])
      : growthByRange[range];
  const newUsersLabel =
    growthData.bucket === "month"
      ? t("newThisMonth")
      : growthData.bucket === "week"
        ? t("newThisWeek")
        : t("newThisDay");

  return (
    <div className="bg-card min-w-0 rounded-xl border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-muted-foreground hidden text-xs sm:block">
            {t("description")}
          </p>
        </div>
        <div className="shrink-0">
          <UserGrowthRangePicker
            activeRange={range}
            customRange={customRange}
            today={growthTimeline.today}
            onPresetSelect={(value) => setRange(value)}
            onCustomApply={(value) => {
              setCustomRange(value);
              setRange("custom");
            }}
          />
        </div>
      </div>
      <div className="space-y-3 pt-3">
        <UserGrowthComboChart
          growthData={growthData}
          newUsersLabel={newUsersLabel}
        />
        <UserGrowthSummary growthData={growthData} />
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
    <div className="bg-card space-y-3 rounded-xl border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
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
            className="w-14 rounded-md border px-1.5 py-1 text-center text-xs tabular-nums"
          />
        </div>
        <p className="text-muted-foreground hidden text-[10px] sm:block">
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

      <div className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("totalImpact")}</p>
          <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block">
            {t("totalImpactDescription")}
          </p>
        </div>
        <div className="text-left sm:text-right">
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
