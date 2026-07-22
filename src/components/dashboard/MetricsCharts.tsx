"use client";

import { forwardRef, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarIcon, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Line,
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
import { Button, type ButtonProps } from "@/components/ui/button";
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
import type {
  AdminMetrics,
  GrowthByRange,
  ProductInsights,
} from "@/lib/server/metrics";
import { cn } from "@/lib/utils";

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
    <div className="divide-y border-t sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:pt-3">
      <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:py-0 sm:pr-3 sm:text-left">
        <p className="text-muted-foreground text-xs leading-snug">
          {t("summary.newInRange")}
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          +{totalNewUsers}
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:px-3 sm:py-0 sm:text-center">
        <p className="text-muted-foreground text-xs leading-snug">
          {t("summary.avgPerPeriod", { period: periodName })}
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {averagePerPeriod.toLocaleString()}
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:py-0 sm:pl-3 sm:text-right">
        <p className="text-muted-foreground text-xs leading-snug">
          {t("summary.strongestPeriod", { period: periodName })}
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums sm:truncate">
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

type RangePickerTriggerProps = Omit<
  ButtonProps,
  "children" | "size" | "variant"
> & {
  label: string;
};

const RangePickerTrigger = forwardRef<
  HTMLButtonElement,
  RangePickerTriggerProps
>(({ label, className, ...triggerProps }, ref) => {
  const t = useTranslations("dashboard.metrics.userGrowth");

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "border-input bg-background hover:bg-muted hover:text-foreground data-[state=open]:bg-muted h-9 w-auto max-w-[9.5rem] justify-start gap-2 rounded-lg border px-2.5 text-left font-normal shadow-xs sm:w-56 sm:max-w-none",
        className
      )}
      {...triggerProps}
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
});
RangePickerTrigger.displayName = "RangePickerTrigger";

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
    <div className="bg-card min-w-0 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground text-xs">{t("description")}</p>
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

// --- Activation, content health, distributions, usage, and retention ---

function formatMonth(period: string) {
  const date = new Date(`${period}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function ActivationFunnel({
  activation,
}: {
  activation: ProductInsights["activation"];
}) {
  const t = useTranslations("dashboard.metrics.activation");
  const max = Math.max(activation.registered, 1);
  const rows = [
    { key: "registered", value: activation.registered },
    { key: "createdProject", value: activation.createdProject },
    { key: "createdShare", value: activation.createdShare },
    { key: "publishedToGallery", value: activation.publishedToGallery },
  ] as const;

  return (
    <div className="space-y-3 py-1">
      {rows.map((row, index) => {
        const pct = Math.round((row.value / max) * 100);
        return (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                {index + 1}. {t(row.key)}
              </span>
              <span className="font-semibold tabular-nums">
                {row.value}{" "}
                <span className="text-muted-foreground">({pct}%)</span>
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-sky-500 transition-[width]"
                style={{ width: `${pct}%`, opacity: 1 - index * 0.14 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContentGrowthChart({
  data,
}: {
  data: ProductInsights["contentGrowth"];
}) {
  const t = useTranslations("dashboard.metrics.contentGrowth");
  const config = {
    projects: { label: t("projects"), color: "var(--chart-1)" },
    shares: { label: t("shares"), color: "var(--chart-4)" },
    presets: { label: t("presets"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const chartData = data.map((row) => ({
    ...row,
    label: formatMonth(row.period),
  }));

  if (chartData.length === 0) {
    return (
      <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <ComposedChart
        accessibilityLayer
        data={chartData}
        margin={{ left: 4, right: 4, top: 4 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={18}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          allowDecimals={false}
          width={30}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="projects"
          stroke="var(--color-projects)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="shares"
          stroke="var(--color-shares)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="presets"
          stroke="var(--color-presets)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function HealthRows({
  rows,
  total,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  const max = Math.max(total, 1);
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs"
        >
          <span className="text-muted-foreground truncate">{row.label}</span>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${row.color}`}
              style={{ width: `${Math.round((row.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-7 text-right font-semibold tabular-nums">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SharingHealth({
  shares,
  gallery,
}: {
  shares: AdminMetrics["shares"];
  gallery: AdminMetrics["gallery"];
}) {
  const t = useTranslations("dashboard.metrics.health");
  return (
    <div className="grid gap-5 py-1 sm:grid-cols-2">
      <section>
        <p className="mb-3 text-xs font-semibold">{t("sharesTitle")}</p>
        <HealthRows
          total={shares.total}
          rows={[
            {
              label: t("active"),
              value: shares.totalActive,
              color: "bg-emerald-500",
            },
            {
              label: t("expired"),
              value: shares.expired,
              color: "bg-amber-500",
            },
            {
              label: t("revoked"),
              value: shares.revoked,
              color: "bg-rose-500",
            },
          ]}
        />
      </section>
      <section>
        <p className="mb-3 text-xs font-semibold">{t("galleryTitle")}</p>
        <HealthRows
          total={gallery.total}
          rows={[
            { label: t("listed"), value: gallery.listed, color: "bg-sky-500" },
            {
              label: t("featured"),
              value: gallery.featured,
              color: "bg-violet-500",
            },
            {
              label: t("hidden"),
              value: gallery.hidden,
              color: "bg-amber-500",
            },
            {
              label: t("missingPreview"),
              value: gallery.missingPreview,
              color: "bg-rose-500",
            },
          ]}
        />
      </section>
    </div>
  );
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

export function DistributionSummary({
  userDistribution,
}: {
  userDistribution: AdminMetrics["userDistribution"];
}) {
  const t = useTranslations("dashboard.metrics.distribution");
  const resources = [
    { key: "projects", index: 0 },
    { key: "shares", index: 1 },
    { key: "presets", index: 2 },
  ] as const;
  const summaries = resources.map((resource) => {
    const all = userDistribution.map((row) => row[resource.index]);
    const active = all.filter((value) => value > 0);
    return {
      ...resource,
      median: percentile(active, 0.5),
      p75: percentile(active, 0.75),
      p90: percentile(active, 0.9),
      zeroPct:
        all.length > 0
          ? Math.round(
              (all.filter((value) => value === 0).length / all.length) * 100
            )
          : 0,
    };
  });

  return (
    <>
      <div className="divide-y sm:hidden">
        {summaries.map((summary) => (
          <div key={summary.key} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{t(summary.key)}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {t("without")}: {summary.zeroPct}%
              </p>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-md px-2 py-2">
                <dt className="text-muted-foreground text-[11px]">
                  {t("median")}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {summary.median}
                </dd>
              </div>
              <div className="bg-muted/50 rounded-md px-2 py-2">
                <dt className="text-muted-foreground text-[11px]">
                  {t("p75")}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {summary.p75}
                </dd>
              </div>
              <div className="bg-muted/50 rounded-md px-2 py-2">
                <dt className="text-muted-foreground text-[11px]">
                  {t("p90")}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {summary.p90}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th scope="col" className="py-2 pr-3 font-medium">
                {t("resource")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("median")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("p75")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("p90")}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t("without")}
              </th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr
                key={summary.key}
                className="hover:bg-muted/35 border-b transition-colors last:border-0"
              >
                <td className="py-2.5 pr-3 font-medium">{t(summary.key)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {summary.median}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {summary.p75}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {summary.p90}
                </td>
                <td className="text-muted-foreground py-2.5 pl-3 text-right tabular-nums">
                  {summary.zeroPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function eventCount(usage: ProductInsights["usage"], eventType: string) {
  return (
    usage.eventTypes30d.find((row) => row.eventType === eventType)?.count ?? 0
  );
}

function previousEventCount(
  usage: ProductInsights["usage"],
  eventType: string
) {
  return (
    usage.eventTypesPrevious30d.find((row) => row.eventType === eventType)
      ?.count ?? 0
  );
}

function hasComparisonBaseline(usage: ProductInsights["usage"]) {
  return usage.trackingDays >= 60;
}

export function MetricsFocusBanner({
  metrics,
  insights,
}: {
  metrics: AdminMetrics;
  insights: ProductInsights;
}) {
  const t = useTranslations("dashboard.metrics.focus");
  const usage = insights.usage;
  const daysTracked = usage.trackingDays;
  const baselineReady = hasComparisonBaseline(usage);
  const movementCandidates = [
    {
      key: "editor",
      eventType: "editor.session_started",
      current: eventCount(usage, "editor.session_started"),
      href: "#editor-behavior",
    },
    {
      key: "exports",
      eventType: "export.completed",
      current: usage.exports30d,
      href: "#export-usage",
    },
    {
      key: "views",
      eventType: "share.viewed",
      current: usage.shareViews30d,
      href: "#share-viewing",
    },
  ] as const;
  const strongestMovement = movementCandidates
    .map((candidate) => {
      const previous = previousEventCount(usage, candidate.eventType);
      const delta =
        previous > 0
          ? Math.round(((candidate.current - previous) / previous) * 100)
          : 0;
      return { ...candidate, previous, delta };
    })
    .filter((candidate) => candidate.previous > 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))[0];

  const hasPreviewIssue = metrics.gallery.missingPreview > 0;
  const focus = hasPreviewIssue
    ? {
        tone: "warning" as const,
        title: t("preview.title"),
        value: t("preview.value", {
          count: metrics.gallery.missingPreview,
          total: metrics.gallery.total,
        }),
        detail: t("preview.detail"),
        question: t("preview.question"),
        href: "#sharing-health",
        link: t("preview.link"),
      }
    : baselineReady && strongestMovement
      ? {
          tone: "neutral" as const,
          title: t("movement.title", {
            metric: t(`metrics.${strongestMovement.key}`),
          }),
          value: t("movement.value", {
            change: `${strongestMovement.delta > 0 ? "+" : ""}${strongestMovement.delta}`,
          }),
          detail: t("movement.detail", {
            current: strongestMovement.current,
            previous: strongestMovement.previous,
          }),
          question: t(`movement.questions.${strongestMovement.key}`),
          href: strongestMovement.href,
          link: t("movement.link"),
        }
      : {
          tone: "building" as const,
          title: t("baseline.title"),
          value: t("baseline.value", { days: Math.min(daysTracked, 60) }),
          detail: t("baseline.detail"),
          question: t("baseline.question"),
          href: "#product-use",
          link: t("baseline.link"),
        };

  return (
    <section
      aria-labelledby="metrics-focus-title"
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-l-4 px-4 py-5 sm:flex-row sm:items-center sm:px-5",
        focus.tone === "warning"
          ? "border-border border-l-amber-500 bg-amber-500/8"
          : focus.tone === "building"
            ? "border-border border-l-muted-foreground/40 bg-muted/35"
            : "border-border border-l-sky-500 bg-sky-500/6"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center",
          focus.tone === "warning"
            ? "text-amber-700 dark:text-amber-300"
            : "text-sky-700 dark:text-sky-300"
        )}
        aria-hidden="true"
      >
        <Search className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {t("eyebrow")}
        </p>
        <div className="mt-0.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h2
            id="metrics-focus-title"
            className="text-base font-semibold sm:text-lg"
          >
            {focus.title}
          </h2>
          <span className="text-xl font-bold tabular-nums">{focus.value}</span>
        </div>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          {focus.detail}
        </p>
        <p className="mt-3 border-t pt-3 text-sm leading-relaxed">
          <span className="font-semibold">{t("nextCheck")}</span>{" "}
          {focus.question}
        </p>
      </div>
      <a
        href={focus.href}
        className="inline-flex w-full shrink-0 items-center justify-between gap-2 text-sm font-semibold underline-offset-4 hover:underline sm:w-auto sm:justify-start"
      >
        {focus.link}
        <ArrowRight className="size-3.5" />
      </a>
    </section>
  );
}

function UsageComparison({
  usage,
  current,
  eventType,
}: {
  usage: ProductInsights["usage"];
  current: number;
  eventType: string;
}) {
  const t = useTranslations("dashboard.metrics.comparison");
  if (!hasComparisonBaseline(usage)) {
    return (
      <span className="text-muted-foreground text-[11px]">{t("building")}</span>
    );
  }
  const previous = previousEventCount(usage, eventType);
  if (previous === 0) return null;
  const delta = Math.round(((current - previous) / previous) * 100);
  return (
    <span className="text-muted-foreground text-[11px] tabular-nums">
      {t(delta === 0 ? "flat" : delta > 0 ? "changeUp" : "changeDown", {
        pct: Math.abs(delta),
      })}
    </span>
  );
}

function UsageBreakdownRows({
  rows,
  total,
  emptyLabel,
}: {
  rows: Array<{ key: string; label: string; count: number }>;
  total: number;
  emptyLabel: string;
}) {
  if (total === 0) {
    return (
      <div className="text-muted-foreground flex min-h-40 items-center justify-center px-4 text-center text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 py-1">
      {rows.map((row) => {
        const pct = Math.round((row.count / total) * 100);
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground min-w-0 leading-snug">
                {row.label}
              </span>
              <span className="font-semibold tabular-nums">
                {row.count}{" "}
                <span className="text-muted-foreground font-normal">
                  ({pct}%)
                </span>
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExportUsageBreakdown({
  usage,
}: {
  usage: ProductInsights["usage"];
}) {
  const t = useTranslations("dashboard.metrics.exportUsage");
  const knownFormats = [
    "png",
    "svg",
    "render3d",
    "racePack",
    "json",
    "webm",
    "velocidrone",
  ] as const;
  const counts = new Map(
    usage.exportFormats30d.map((row) => [row.format, row.count])
  );
  const rows = knownFormats
    .map((format) => ({
      key: format,
      label: t(`formats.${format}`),
      count: counts.get(format) ?? 0,
    }))
    .filter((row) => row.count > 0);
  const knownFormatSet = new Set<string>(knownFormats);
  const extras = usage.exportFormats30d
    .filter((row) => !knownFormatSet.has(row.format))
    .map((row) => ({ key: row.format, label: row.format, count: row.count }));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 border-b pb-3">
        <span className="text-muted-foreground text-xs">{t("summary")}</span>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums">{usage.exports30d}</p>
          <UsageComparison
            usage={usage}
            current={usage.exports30d}
            eventType="export.completed"
          />
        </div>
      </div>
      <UsageBreakdownRows
        rows={[...rows, ...extras]}
        total={usage.exports30d}
        emptyLabel={t("noData")}
      />
    </div>
  );
}

export function ShareUsageBreakdown({
  usage,
}: {
  usage: ProductInsights["usage"];
}) {
  const t = useTranslations("dashboard.metrics.shareUsage");
  const counts = new Map(
    usage.shareSurfaces30d.map((row) => [row.surface, row.count])
  );
  const knownSurfaces = ["share", "embed"] as const;
  const rows = knownSurfaces.map((surface) => ({
    key: surface,
    label: t(`surfaces.${surface}`),
    count: counts.get(surface) ?? 0,
  }));
  const knownSurfaceSet = new Set<string>(knownSurfaces);
  const extras = usage.shareSurfaces30d
    .filter((row) => !knownSurfaceSet.has(row.surface))
    .map((row) => ({ key: row.surface, label: row.surface, count: row.count }));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 border-b pb-3">
        <span className="text-muted-foreground text-xs">{t("summary")}</span>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums">
            {usage.shareViews30d}
          </p>
          <UsageComparison
            usage={usage}
            current={usage.shareViews30d}
            eventType="share.viewed"
          />
        </div>
      </div>
      <UsageBreakdownRows
        rows={[...rows, ...extras]}
        total={usage.shareViews30d}
        emptyLabel={t("noData")}
      />
    </div>
  );
}

function formatEventKind(kind: string) {
  return kind
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function EditorUsageBreakdown({
  usage,
}: {
  usage: ProductInsights["usage"];
}) {
  const t = useTranslations("dashboard.metrics.editorUsage");
  const editorStarts = eventCount(usage, "editor.session_started");
  const primaryStats = [
    ["sessions", editorStarts],
    ["accountSessions", usage.accountSessions30d],
    ["anonymousSessions", usage.anonymousSessions30d],
    ["preview3d", usage.preview3dOpens30d],
    ["imports", usage.imports30d],
    ["placed", usage.elementPlacements30d],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{t("sessions")}</p>
          <div className="mt-1 flex items-end gap-3">
            <p className="text-3xl leading-none font-bold tabular-nums">
              {editorStarts}
            </p>
            <UsageComparison
              usage={usage}
              current={editorStarts}
              eventType="editor.session_started"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:min-w-64">
          {primaryStats.slice(1, 3).map(([key, value]) => (
            <div key={key}>
              <p className="text-muted-foreground text-xs">{t(key)}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 sm:divide-x">
        {primaryStats.slice(3).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between border-b py-3 last:border-b-0 sm:block sm:border-b-0 sm:px-4 sm:py-1 sm:first:pl-0 sm:last:pr-0"
          >
            <p className="text-muted-foreground text-sm">{t(key)}</p>
            <p className="font-semibold tabular-nums sm:mt-1 sm:text-xl">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 border-y py-3">
        <div>
          <p className="text-muted-foreground text-xs">{t("importedShapes")}</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {usage.importedShapes30d}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t("avgImport")}</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {usage.avgShapesPerImport30d}
          </p>
        </div>
      </div>
      {usage.elementTypes30d.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">{t("topTypes")}</p>
          <div className="flex flex-wrap gap-2">
            {usage.elementTypes30d.slice(0, 8).map((row) => (
              <span
                key={row.kind}
                className="bg-muted rounded-md px-2 py-1 text-xs"
              >
                {formatEventKind(row.kind)} · {row.count}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground py-5 text-center text-sm">
          {t("noData")}
        </p>
      )}
    </div>
  );
}

export function RetentionCohorts({
  retention,
}: {
  retention: ProductInsights["retention"];
}) {
  const t = useTranslations("dashboard.metrics.retention");
  if (retention.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th scope="col" className="py-2 pr-2 font-medium sm:pr-3">
              {t("cohort")}
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-right font-medium sm:px-3"
            >
              {t("users")}
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-right font-medium sm:px-3"
            >
              {t("day7")}
            </th>
            <th
              scope="col"
              className="py-2 pl-2 text-right font-medium sm:pl-3"
            >
              {t("day30")}
            </th>
          </tr>
        </thead>
        <tbody>
          {retention.map((row) => (
            <tr
              key={row.cohort}
              className="hover:bg-muted/35 border-b transition-colors last:border-0"
            >
              <td className="py-2.5 pr-3 font-medium">
                {formatMonth(row.cohort)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {row.users}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {row.users > 0
                  ? Math.round((row.retained7d / row.users) * 100)
                  : 0}
                %
              </td>
              <td className="py-2.5 pl-3 text-right tabular-nums">
                {row.users > 0
                  ? Math.round((row.retained30d / row.users) * 100)
                  : 0}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="bg-card space-y-4 rounded-xl border p-4">
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
            tick={{ fontSize: 10 }}
            tickMargin={4}
            label={{
              value: t("perUserAxis", { title }),
              position: "insideBottom",
              offset: -12,
              style: { fontSize: 10, fill: "var(--muted-foreground)" },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            allowDecimals={false}
            width={28}
            label={{
              value: t("usersAxis"),
              angle: -90,
              position: "insideLeft",
              offset: 8,
              style: { fontSize: 10, fill: "var(--muted-foreground)" },
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
            className="h-9 w-16 rounded-md border px-2 text-center text-sm tabular-nums"
          />
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
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
      <div className="grid gap-4 lg:grid-cols-3">
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
          <p className="text-sm font-semibold">{t("totalImpact")}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
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
