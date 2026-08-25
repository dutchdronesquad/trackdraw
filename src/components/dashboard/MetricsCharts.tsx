"use client";

import { forwardRef, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarIcon, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
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
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  calculateCostCoverageEstimate,
  calculateCostPerActiveCreator,
  calculateCreatorRange,
  calculatePlanLimitImpact,
} from "@/lib/metrics-planning";
import type {
  AdminMetrics,
  GrowthByRange,
  ProductInsights,
} from "@/lib/server/metrics";
import { cn } from "@/lib/utils";

function DataTableDisclosure({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <details className="border-t pt-3">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
        {label}
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    "px-3 py-2 font-medium first:pl-0 last:pr-0",
                    index > 0 && "text-right"
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b last:border-0">
                {row.map((value, columnIndex) => (
                  <td
                    key={columnIndex}
                    className={cn(
                      "px-3 py-2 tabular-nums first:pl-0 last:pr-0",
                      columnIndex > 0 && "text-right"
                    )}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// --- User population donut with center label ---

export function UserPopulationChart({
  users,
}: {
  users: AdminMetrics["users"];
}) {
  const t = useTranslations("dashboard.metrics.userPopulation");
  const dormant = Math.max(
    0,
    users.total - users.activeLastThirtyDays - users.neverCreatedProject
  );

  const data = [
    {
      name: "active",
      label: t("active"),
      value: users.activeLastThirtyDays,
      fill: "var(--chart-2)",
    },
    {
      name: "dormant",
      label: t("dormant"),
      value: dormant,
      fill: "var(--chart-3)",
    },
    {
      name: "neverCreated",
      label: t("neverCreated"),
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
    <div className="space-y-4">
      <div
        className="bg-muted flex h-4 overflow-hidden rounded-full"
        role="img"
        aria-label={data
          .map(
            (item) =>
              `${item.label}: ${item.value} (${Math.round((item.value / users.total) * 100)}%)`
          )
          .join(", ")}
      >
        {data.map((item) => (
          <span
            key={item.name}
            style={{
              width: `${(item.value / users.total) * 100}%`,
              backgroundColor: item.fill,
            }}
          />
        ))}
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {data.map((item) => (
          <div key={item.name} className="rounded-lg border p-3">
            <dt className="flex items-center gap-2 text-sm font-medium">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: item.fill }}
                aria-hidden="true"
              />
              {item.label}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {item.value}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                ({Math.round((item.value / users.total) * 100)}%)
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// --- User growth charts ---

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

type UserGrowthTooltipPayload = {
  color?: string;
  dataKey?: string | number;
  value?: number | string;
};

function UserGrowthTooltip({
  active,
  label,
  newUsersLabel,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  newUsersLabel: string;
  payload?: UserGrowthTooltipPayload[];
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const locale = useLocale();

  if (!active || !payload?.length) return null;

  const valueFor = (key: "totalUsers" | "newUsers") =>
    payload.find((item) => item.dataKey === key)?.value;
  const formatValue = (value: number | string | undefined) =>
    typeof value === "number"
      ? new Intl.NumberFormat(locale).format(value)
      : String(value ?? "—");
  const newUsersValue = valueFor("newUsers");
  const rows = [
    {
      key: "totalUsers" as const,
      label: t("totalUsers"),
      value: formatValue(valueFor("totalUsers")),
    },
    {
      key: "newUsers" as const,
      label: newUsersLabel,
      value:
        newUsersValue === undefined ? "—" : `+${formatValue(newUsersValue)}`,
    },
  ];

  return (
    <div className="bg-popover/95 min-w-44 rounded-lg border px-3 py-2.5 text-xs shadow-lg backdrop-blur-sm">
      <p className="text-foreground mb-2 font-semibold">{label}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: `var(--color-${row.key})` }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-foreground pl-3 font-mono font-semibold tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserGrowthComboChart({
  growthData,
  newUsersLabel,
  compact = false,
}: {
  growthData: GrowthData;
  newUsersLabel: string;
  compact?: boolean;
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
    <div className="space-y-3">
      <ChartContainer
        config={growthComboConfig}
        className={cn(compact ? "h-52" : "h-64", "w-full")}
      >
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
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            yAxisId="total"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            allowDecimals={false}
            width={36}
          />
          <YAxis
            yAxisId="new"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            allowDecimals={false}
            width={36}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
            content={<UserGrowthTooltip newUsersLabel={newUsersLabel} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            yAxisId="total"
            type="monotone"
            dataKey="totalUsers"
            stroke="var(--color-totalUsers)"
            strokeWidth={2}
            fill="url(#growthAreaGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Bar
            yAxisId="new"
            dataKey="newUsers"
            fill="var(--color-newUsers)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </ComposedChart>
      </ChartContainer>
      {compact ? null : (
        <DataTableDisclosure
          label={t("viewData")}
          columns={[t("periodColumn"), t("totalUsers"), newUsersLabel]}
          rows={data.map((row) => [row.label, row.totalUsers, row.newUsers])}
        />
      )}
    </div>
  );
}

function UserGrowthSummary({
  growthData,
  compact = false,
}: {
  growthData: GrowthData;
  compact?: boolean;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const locale = useLocale();
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
    <div
      className={cn(
        "divide-y border-t sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        compact ? "sm:pt-2" : "sm:pt-3"
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:py-0 sm:pr-3 sm:text-left">
        <p className="text-muted-foreground text-sm leading-snug">
          {t("summary.newInRange")}
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          +{totalNewUsers}
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:px-3 sm:py-0 sm:text-center">
        <p className="text-muted-foreground text-sm leading-snug">
          {t("summary.avgPerPeriod", { period: periodName })}
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {new Intl.NumberFormat(locale, {
            maximumFractionDigits: 1,
          }).format(averagePerPeriod)}
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:py-0 sm:pl-3 sm:text-right">
        <p className="text-muted-foreground text-sm leading-snug">
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
        "border-input bg-background hover:bg-muted hover:text-foreground data-[state=open]:bg-muted h-8 w-auto max-w-[12rem] justify-start gap-2 rounded-lg border px-3 text-left text-xs font-normal shadow-xs",
        className
      )}
      aria-label={`${t("picker.range")} ${label}`}
      {...triggerProps}
    >
      <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
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
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            {t("picker.presets")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {GROWTH_RANGE_VALUES.map((value) => (
              <Button
                key={value}
                type="button"
                aria-pressed={activeRange === value}
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
              aria-pressed={activeRange === value}
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

export function UserGrowthRangePicker({
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
          <DrawerTrigger asChild>
            <RangePickerTrigger label={triggerLabel} />
          </DrawerTrigger>
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
  bare = false,
  compact = false,
  activeRange,
  activeCustomRange,
  onPresetSelect,
  onCustomApply,
  showRangePicker = true,
}: {
  growthByRange: GrowthByRange;
  growthTimeline: GrowthTimeline;
  bare?: boolean;
  compact?: boolean;
  activeRange?: GrowthRange;
  activeCustomRange?: GrowthCustomRange | null;
  onPresetSelect?: (range: GrowthPresetRange) => void;
  onCustomApply?: (range: GrowthCustomRange) => void;
  showRangePicker?: boolean;
}) {
  const t = useTranslations("dashboard.metrics.userGrowth");
  const [internalRange, setInternalRange] = useState<GrowthRange>("3m");
  const [internalCustomRange, setInternalCustomRange] =
    useState<GrowthCustomRange | null>(null);
  const range = activeRange ?? internalRange;
  const customRange =
    activeCustomRange !== undefined ? activeCustomRange : internalCustomRange;
  const selectPreset = (value: GrowthPresetRange) => {
    if (onPresetSelect) onPresetSelect(value);
    else setInternalRange(value);
  };
  const applyCustom = (value: GrowthCustomRange) => {
    if (onCustomApply) onCustomApply(value);
    else {
      setInternalCustomRange(value);
      setInternalRange("custom");
    }
  };
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

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p
            className={cn(
              "text-muted-foreground text-sm",
              compact ? "sr-only" : "leading-relaxed"
            )}
          >
            {t("description")}
          </p>
        </div>
        {showRangePicker ? (
          <div className="shrink-0">
            <UserGrowthRangePicker
              activeRange={range}
              customRange={customRange}
              today={growthTimeline.today}
              onPresetSelect={selectPreset}
              onCustomApply={applyCustom}
            />
          </div>
        ) : null}
      </div>
      <div className={cn("space-y-3", compact ? "pt-2" : "pt-3")}>
        <UserGrowthComboChart
          growthData={growthData}
          newUsersLabel={newUsersLabel}
          compact={compact}
        />
        <UserGrowthSummary growthData={growthData} compact={compact} />
      </div>
    </>
  );

  if (bare) return content;

  return (
    <div className="bg-card min-w-0 rounded-xl border p-4 sm:p-5">
      {content}
    </div>
  );
}

// --- Activation, content health, distributions, usage, and retention ---

function formatMonth(period: string, locale: string) {
  const date = new Date(`${period}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(locale, {
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
        const totalPct = Math.round((row.value / max) * 100);
        const previousValue = index > 0 ? rows[index - 1].value : row.value;
        const stepPct =
          previousValue > 0 ? Math.round((row.value / previousValue) * 100) : 0;
        return (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted-foreground leading-snug">
                {index + 1}. {t(row.key)}
              </span>
              <span className="shrink-0 text-right font-semibold tabular-nums">
                {row.value}
                <span className="text-muted-foreground block text-xs font-normal">
                  {index === 0
                    ? t("baseline")
                    : t("conversion", { step: stepPct, total: totalPct })}
                </span>
              </span>
            </div>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={t(row.key)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={totalPct}
            >
              <div
                className="h-full rounded-full bg-sky-500 transition-[width]"
                style={{ width: `${totalPct}%`, opacity: 1 - index * 0.14 }}
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
  const locale = useLocale();
  const config = {
    projects: { label: t("projects"), color: "var(--chart-1)" },
    shares: { label: t("shares"), color: "var(--chart-4)" },
    presets: { label: t("presets"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const chartData = data.map((row) => ({
    ...row,
    label: formatMonth(row.period, locale),
  }));

  if (chartData.length === 0) {
    return (
      <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
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
            strokeDasharray="0"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="shares"
            stroke="var(--color-shares)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="presets"
            stroke="var(--color-presets)"
            strokeWidth={2}
            strokeDasharray="2 4"
            dot={{ r: 2 }}
          />
        </ComposedChart>
      </ChartContainer>
      <DataTableDisclosure
        label={t("viewData")}
        columns={[t("period"), t("projects"), t("shares"), t("presets")]}
        rows={chartData.map((row) => [
          row.label,
          row.projects,
          row.shares,
          row.presets,
        ])}
      />
    </div>
  );
}

export function GrowthTabs({
  growthByRange,
  growthTimeline,
  contentGrowth,
}: {
  growthByRange: GrowthByRange;
  growthTimeline: GrowthTimeline;
  contentGrowth: ProductInsights["contentGrowth"];
}) {
  const t = useTranslations("dashboard.metrics");

  return (
    <Tabs
      defaultValue="users"
      className="bg-card min-w-0 rounded-xl border p-4 sm:p-5"
    >
      <TabsList aria-label={t("growthTabs.label")}>
        <TabsTrigger value="users">{t("growthTabs.users")}</TabsTrigger>
        <TabsTrigger value="content">{t("growthTabs.content")}</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-4">
        <UserGrowthCard
          growthByRange={growthByRange}
          growthTimeline={growthTimeline}
          bare
        />
      </TabsContent>
      <TabsContent value="content" className="mt-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold">{t("contentGrowth.title")}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("contentGrowth.description")}
          </p>
        </div>
        <div className="pt-3">
          <ContentGrowthChart data={contentGrowth} />
        </div>
      </TabsContent>
    </Tabs>
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
          className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-sm"
        >
          <span className="text-muted-foreground truncate">{row.label}</span>
          <div
            className="bg-muted h-1.5 overflow-hidden rounded-full"
            aria-hidden="true"
          >
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
        <p className="mb-3 text-sm font-semibold">{t("sharesTitle")}</p>
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
        <p className="mb-3 text-sm font-semibold">{t("galleryTitle")}</p>
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
                <dt className="text-muted-foreground text-xs">{t("median")}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {summary.median}
                </dd>
              </div>
              <div className="bg-muted/50 rounded-md px-2 py-2">
                <dt className="text-muted-foreground text-xs">{t("p75")}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {summary.p75}
                </dd>
              </div>
              <div className="bg-muted/50 rounded-md px-2 py-2">
                <dt className="text-muted-foreground text-xs">{t("p90")}</dt>
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

export function MetricsFocusBanner({ metrics }: { metrics: AdminMetrics }) {
  const t = useTranslations("dashboard.metrics.focus");
  if (metrics.gallery.missingPreview === 0) return null;

  return (
    <section
      aria-labelledby="metrics-focus-title"
      className="flex flex-col gap-3 rounded-xl border border-l-4 border-l-amber-500 bg-amber-500/8 p-4 sm:flex-row sm:items-center"
    >
      <Search
        className="size-5 shrink-0 text-amber-700 dark:text-amber-300"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h2 id="metrics-focus-title" className="text-sm font-semibold">
          {t("preview.title")}:{" "}
          {t("preview.value", {
            count: metrics.gallery.missingPreview,
            total: metrics.gallery.total,
          })}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
          {t("preview.detail")}
        </p>
      </div>
      <a
        href="#sharing-health"
        className="inline-flex shrink-0 items-center gap-2 self-start text-sm font-semibold underline-offset-4 hover:underline sm:self-center"
      >
        {t("preview.link")}
        <ArrowRight className="size-3.5" aria-hidden="true" />
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
      <span className="text-muted-foreground text-xs">
        {t("buildingProgress", {
          elapsed: Math.min(usage.trackingDays, 60),
          total: 60,
        })}
      </span>
    );
  }
  const previous = previousEventCount(usage, eventType);
  if (current < 30 || previous < 30) {
    return (
      <span className="text-muted-foreground text-xs">{t("lowVolume")}</span>
    );
  }
  if (previous === 0) return null;
  const delta = Math.round(((current - previous) / previous) * 100);
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
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
  compact = false,
}: {
  rows: Array<{ key: string; label: string; count: number }>;
  total: number;
  emptyLabel: string;
  compact?: boolean;
}) {
  if (total === 0) {
    return (
      <div className="text-muted-foreground flex min-h-40 items-center justify-center px-4 text-center text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn(compact ? "space-y-0.5" : "space-y-2.5", "py-1")}>
      {rows.map((row) => {
        const pct = Math.round((row.count / total) * 100);
        return (
          <div key={row.key} className={compact ? "space-y-0.5" : "space-y-1"}>
            <div
              className={cn(
                "flex items-center justify-between gap-3",
                compact ? "text-xs" : "text-sm"
              )}
            >
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
            <div
              className={cn(
                "bg-muted overflow-hidden rounded-full",
                compact ? "h-1" : "h-2"
              )}
              aria-hidden="true"
            >
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
  compact = false,
}: {
  usage: ProductInsights["usage"];
  compact?: boolean;
}) {
  const t = useTranslations("dashboard.metrics.exportUsage");
  const formatTranslationKeys = {
    png: "png",
    svg: "svg",
    render_3d: "render3d",
    race_pack: "racePack",
    json: "json",
    webm: "webm",
    velocidrone: "velocidrone",
  } as const;
  const knownFormats = Object.keys(
    formatTranslationKeys
  ) as (keyof typeof formatTranslationKeys)[];
  const counts = new Map(
    usage.exportFormats30d.map((row) => [row.format, row.count])
  );
  const rows = knownFormats
    .map((format) => ({
      key: format,
      label: t(`formats.${formatTranslationKeys[format]}`),
      count: counts.get(format) ?? 0,
    }))
    .filter((row) => row.count > 0);
  const knownFormatSet = new Set<string>(knownFormats);
  const extras = usage.exportFormats30d
    .filter((row) => !knownFormatSet.has(row.format))
    .map((row) => ({ key: row.format, label: row.format, count: row.count }));
  const sortedRows = [...rows, ...extras].sort(
    (left, right) =>
      right.count - left.count || left.key.localeCompare(right.key)
  );

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div
        className={cn(
          "flex items-end justify-between gap-3 border-b",
          compact ? "pb-2" : "pb-3"
        )}
      >
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {t("summary")}
        </span>
        <div className="text-right">
          <p
            className={cn(
              "font-bold tabular-nums",
              compact ? "text-lg" : "text-xl"
            )}
          >
            {usage.exports30d}
          </p>
          <UsageComparison
            usage={usage}
            current={usage.exports30d}
            eventType="export.completed"
          />
        </div>
      </div>
      <UsageBreakdownRows
        rows={sortedRows}
        total={usage.exports30d}
        emptyLabel={t("noData")}
        compact={compact}
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
        <span className="text-muted-foreground text-sm">{t("summary")}</span>
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

export function EmbedReachTable({
  usage,
}: {
  usage: ProductInsights["usage"];
}) {
  const t = useTranslations("dashboard.metrics.embedReach");
  const locale = useLocale();
  const knownViews = usage.embedReferrerSummary30d.views;

  if (usage.embedReferrers30d.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-32 items-center justify-center px-4 text-center text-sm">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <dl className="grid border-y sm:grid-cols-2 sm:divide-x">
        <div className="py-3 sm:pr-4">
          <dt className="text-muted-foreground text-sm">{t("knownSites")}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {usage.embedReferrerSummary30d.hostnames}
          </dd>
        </div>
        <div className="border-t py-3 sm:border-t-0 sm:pl-4">
          <dt className="text-muted-foreground text-sm">{t("knownViews")}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {knownViews}
          </dd>
        </div>
      </dl>
      <div
        role="region"
        aria-label={t("tableLabel")}
        className="overflow-x-auto"
      >
        <table className="w-full min-w-[54rem] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th scope="col" className="py-2 pr-3 font-medium">
                {t("website")}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t("track")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("views")}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t("share")}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t("trend")}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t("lastSeen")}
              </th>
            </tr>
          </thead>
          <tbody>
            {usage.embedReferrers30d.map((referrer) => {
              const share =
                knownViews > 0
                  ? Math.round((referrer.views / knownViews) * 100)
                  : 0;
              const change =
                referrer.previousViews > 0
                  ? Math.round(
                      ((referrer.views - referrer.previousViews) /
                        referrer.previousViews) *
                        100
                    )
                  : null;
              return (
                <tr
                  key={`${referrer.shareToken}:${referrer.hostname}`}
                  className="hover:bg-muted/35 border-b last:border-0"
                >
                  <td className="py-3 pr-3 font-medium">{referrer.hostname}</td>
                  <td className="px-3 py-3">
                    <a
                      href={`/share/${referrer.shareToken}`}
                      className="decoration-muted-foreground/50 underline underline-offset-4 hover:decoration-current"
                    >
                      {referrer.shareTitle}
                    </a>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {referrer.views}
                  </td>
                  <td className="py-3 pl-3 text-right tabular-nums">
                    {share}%
                  </td>
                  <td className="py-3 pl-3 text-right tabular-nums">
                    {change == null
                      ? t("newTrend")
                      : change === 0
                        ? t("flatTrend")
                        : t(change > 0 ? "upTrend" : "downTrend", {
                            pct: Math.abs(change),
                          })}
                  </td>
                  <td className="py-3 pl-3 text-right tabular-nums">
                    <time dateTime={referrer.lastSeen}>
                      {new Intl.DateTimeFormat(locale, {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      }).format(new Date(`${referrer.lastSeen}T00:00:00Z`))}
                    </time>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {usage.embedReferrerSummary30d.rows > usage.embedReferrers30d.length && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t("showingTop", {
            shown: usage.embedReferrers30d.length,
            total: usage.embedReferrerSummary30d.rows,
          })}
        </p>
      )}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t("privacyNote")}
      </p>
    </div>
  );
}

export function UsageTabs({ usage }: { usage: ProductInsights["usage"] }) {
  const t = useTranslations("dashboard.metrics");
  const tabs = [
    {
      value: "editor",
      label: t("usageTabs.editor"),
      title: t("editorUsage.title"),
      description: t("editorUsage.description"),
      content: <EditorUsageBreakdown usage={usage} />,
    },
    {
      value: "exports",
      label: t("usageTabs.exports"),
      title: t("exportUsage.title"),
      description: t("exportUsage.description"),
      content: <ExportUsageBreakdown usage={usage} />,
    },
    {
      value: "sharing",
      label: t("usageTabs.sharing"),
      title: t("shareUsage.title"),
      description: t("shareUsage.description"),
      content: (
        <div className="space-y-6">
          <ShareUsageBreakdown usage={usage} />
          <section
            aria-labelledby="embed-reach-title"
            className="space-y-1 border-t pt-5"
          >
            <h4 id="embed-reach-title" className="text-sm font-semibold">
              {t("embedReach.title")}
            </h4>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {t("embedReach.description")}
            </p>
            <div className="pt-3">
              <EmbedReachTable usage={usage} />
            </div>
          </section>
        </div>
      ),
    },
  ];

  return (
    <Tabs defaultValue="editor" className="min-w-0">
      <div className="overflow-x-auto pb-1">
        <TabsList aria-label={t("usageTabs.label")} className="min-w-max">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          id={`${tab.value}-usage`}
          className="bg-card mt-3 rounded-xl border p-4 sm:p-5"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{tab.title}</h3>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {tab.description}
            </p>
          </div>
          <div className="pt-4">{tab.content}</div>
        </TabsContent>
      ))}
    </Tabs>
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
              <p className="text-muted-foreground text-sm">{t(key)}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 border-b pb-4">
        <div>
          <p className="text-sm font-semibold">{t("funnel.title")}</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {t("funnel.description")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th
                  scope="col"
                  className="w-1/2 py-2 pr-3 text-left font-medium"
                >
                  {t("funnel.step")}
                </th>
                <th
                  scope="col"
                  className="w-1/4 px-3 py-2 text-right font-medium"
                >
                  {t("funnel.anonymous")}
                </th>
                <th
                  scope="col"
                  className="w-1/4 py-2 pl-3 text-right font-medium"
                >
                  {t("funnel.account")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(["started", "edited", "valuable"] as const).map((step) => (
                <tr key={step} className="border-b last:border-0">
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                    {t(`funnel.steps.${step}`)}
                  </th>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {usage.creatorFunnel30d.anonymous[step]}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">
                    {usage.creatorFunnel30d.account[step]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="grid gap-3 border-t pt-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground text-sm">
              {t("segments.newCreators")}
            </dt>
            <dd className="font-semibold tabular-nums sm:mt-1 sm:text-lg">
              {usage.accountCreatorSegments30d.newCreators}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground text-sm">
              {t("segments.returningCreators")}
            </dt>
            <dd className="font-semibold tabular-nums sm:mt-1 sm:text-lg">
              {usage.accountCreatorSegments30d.returningCreators}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("segments.note")}
        </p>
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
          <p className="text-muted-foreground text-sm">{t("importedShapes")}</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {usage.importedShapes30d}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{t("avgImport")}</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {usage.avgShapesPerImport30d}
          </p>
        </div>
      </div>
      {usage.elementTypes30d.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{t("topTypes")}</p>
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
  const locale = useLocale();
  if (retention.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-sm">
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
                {formatMonth(row.cohort, locale)}
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

const CANDIDATE_LIMIT_MAX = 20;
const HISTOGRAM_OVERFLOW_BUCKET = CANDIDATE_LIMIT_MAX + 1;

const SAFE_COLOR = "var(--chart-1)";
const AFFECTED_COLOR = "hsl(0 72% 51%)";

type DistRow = [number, number, number];

function buildHistogram(counts: number[]) {
  const freq: number[] = Array(HISTOGRAM_OVERFLOW_BUCKET + 1).fill(0);
  for (const c of counts) {
    freq[Math.min(c, HISTOGRAM_OVERFLOW_BUCKET)]++;
  }
  return freq.map((users, bucket) => ({
    label:
      bucket === HISTOGRAM_OVERFLOW_BUCKET
        ? `${HISTOGRAM_OVERFLOW_BUCKET}+`
        : String(bucket),
    bucket,
    users,
  }));
}

function ResourceCard({
  title,
  counts,
  limit,
  totalUsers,
  near,
  above,
  onLimitChange,
}: {
  title: string;
  counts: number[];
  limit: number;
  totalUsers: number;
  near: number;
  above: number;
  onLimitChange: (v: number) => void;
}) {
  const t = useTranslations("dashboard.metrics.planLimit");
  const inputId = useId();
  const rangeId = `${inputId}-range`;
  const numberId = `${inputId}-number`;
  const resultId = `${inputId}-result`;
  const descriptionId = `${inputId}-description`;
  const distConfig = { users: { label: t("usersAxis") } } satisfies ChartConfig;
  const histogram = useMemo(
    () => buildHistogram(counts).filter((entry) => entry.bucket !== 0),
    [counts]
  );
  const pct = totalUsers > 0 ? Math.round((above / totalUsers) * 100) : 0;

  return (
    <fieldset className="grid min-w-0 gap-4 border-t p-4 first:border-t-0 md:grid-cols-[8rem_minmax(14rem,1fr)_8rem_8rem] md:items-center">
      <legend className="sr-only">
        {t("fieldsetLegend", { resource: title })}
      </legend>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t("observedDistribution")}
        </p>
        <span className="mt-2 inline-flex rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {t("observed")}
        </span>
      </div>

      <div className="min-w-0">
        <ChartContainer config={distConfig} className="h-32 w-full">
          <BarChart
            accessibilityLayer
            data={histogram}
            margin={{ left: 0, right: 0, top: 2, bottom: 18 }}
            barCategoryGap="12%"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickMargin={4}
              label={{
                value: t("perUserAxis", { title }),
                position: "insideBottom",
                offset: -12,
                style: { fontSize: 11, fill: "var(--muted-foreground)" },
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              width={28}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const count = Number(payload[0]?.value ?? 0);
                const qualifier =
                  label === `${HISTOGRAM_OVERFLOW_BUCKET}+`
                    ? ""
                    : t("withExactly");
                return (
                  <div className="bg-card border-border/50 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                    <p className="text-foreground font-semibold tabular-nums">
                      {t("usersCount", { count })}
                    </p>
                    <p className="text-muted-foreground">
                      {t("withCount", {
                        qualifier,
                        count: String(label ?? ""),
                        resource: title.toLowerCase(),
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
                  fillOpacity={entry.bucket > limit ? 0.72 : 0.68}
                  stroke={entry.bucket > limit ? "var(--foreground)" : "none"}
                  strokeWidth={entry.bucket > limit ? 1.5 : 0}
                  strokeDasharray={entry.bucket > limit ? "3 2" : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <div className="space-y-2">
        <label htmlFor={numberId} className="text-muted-foreground text-xs">
          {t("candidateLimit")}
        </label>
        <input
          id={numberId}
          type="number"
          aria-label={t("numberLabel", { resource: title })}
          min={0}
          max={CANDIDATE_LIMIT_MAX}
          value={limit}
          aria-describedby={`${resultId} ${descriptionId}`}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= 0 && n <= CANDIDATE_LIMIT_MAX) {
              onLimitChange(n);
            }
          }}
          className="h-11 w-full rounded-md border bg-transparent px-3 text-base tabular-nums md:h-9 md:px-2 md:text-sm"
        />
        <label htmlFor={rangeId} className="sr-only">
          {t("rangeLabel", { resource: title })}
        </label>
        <input
          id={rangeId}
          type="range"
          min={0}
          max={CANDIDATE_LIMIT_MAX}
          value={limit}
          aria-describedby={`${resultId} ${descriptionId}`}
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          className="accent-foreground h-11 w-full cursor-pointer md:h-9"
        />
      </div>

      <div>
        <span
          id={resultId}
          role="status"
          aria-live="polite"
          className={`text-xl font-bold tabular-nums ${
            above > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground"
          }`}
        >
          {above}
        </span>
        <p className="text-muted-foreground text-xs">
          {t("aboveLimit", { pct })}
        </p>
        <p className="mt-1 text-xs tabular-nums">{t("nearLimit", { near })}</p>
      </div>
      <p id={descriptionId} className="sr-only">
        {t("limitExplanation", { limit })}
      </p>
      <div className="md:col-span-4">
        <DataTableDisclosure
          label={t("viewData")}
          columns={[t("resourceCount", { resource: title }), t("usersAxis")]}
          rows={histogram.map((entry) => [entry.label, entry.users])}
        />
      </div>
    </fieldset>
  );
}

export function PlanLimitSimulator({
  userDistribution,
  activeCreators,
}: {
  userDistribution: DistRow[];
  activeCreators: number;
}) {
  const t = useTranslations("dashboard.metrics.planLimit");
  const locale = useLocale();
  const [limits, setLimits] = useState({ projects: 5, shares: 5, presets: 5 });
  const [monthlyCostInput, setMonthlyCostInput] = useState("");
  const [costSource, setCostSource] = useState("");
  const [pricingAssumptions, setPricingAssumptions] = useState({
    paidAdoption: "5",
    costBuffer: "0",
  });
  const [behaviorRange, setBehaviorRange] = useState({
    lower: "0",
    upper: "0",
  });

  const activeDistribution = useMemo(
    () => userDistribution.filter(([p, s, pr]) => p > 0 || s > 0 || pr > 0),
    [userDistribution]
  );
  const totalUsers = activeDistribution.length;
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

  const impact = useMemo(
    () => calculatePlanLimitImpact(userDistribution, limits),
    [limits, userDistribution]
  );
  const monthlyCost = Math.max(0, Number(monthlyCostInput) || 0);
  const costPerCreator = calculateCostPerActiveCreator(
    monthlyCost,
    activeCreators
  );
  const costCoverageEstimate = calculateCostCoverageEstimate(
    monthlyCost,
    activeCreators,
    Number(pricingAssumptions.paidAdoption),
    Number(pricingAssumptions.costBuffer)
  );
  const creatorRange = calculateCreatorRange(
    activeCreators,
    Number(behaviorRange.lower) || 0,
    Number(behaviorRange.upper) || 0
  );
  const impactPct =
    totalUsers > 0 ? Math.round((impact.nearOrAboveAny / totalUsers) * 100) : 0;
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(value);

  if (userDistribution.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{t("title")}</h2>
                <span className="rounded-md border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  {t("simulated")}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t("simulationAssumption")}
              </p>
            </div>
            <p className="text-muted-foreground shrink-0 text-xs">
              {t("distributionSource")}
            </p>
          </div>
          <ResourceCard
            title={t("projects")}
            counts={projCounts}
            limit={limits.projects}
            totalUsers={totalUsers}
            near={impact.resources.projects.near}
            above={impact.resources.projects.above}
            onLimitChange={(v) =>
              setLimits((prev) => ({ ...prev, projects: v }))
            }
          />
          <ResourceCard
            title={t("shareLinks")}
            counts={shareCounts}
            limit={limits.shares}
            totalUsers={totalUsers}
            near={impact.resources.shares.near}
            above={impact.resources.shares.above}
            onLimitChange={(v) => setLimits((prev) => ({ ...prev, shares: v }))}
          />
          <ResourceCard
            title={t("presets")}
            counts={presetCounts}
            limit={limits.presets}
            totalUsers={totalUsers}
            near={impact.resources.presets.near}
            above={impact.resources.presets.above}
            onLimitChange={(v) =>
              setLimits((prev) => ({ ...prev, presets: v }))
            }
          />
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 border-t px-4 py-3 text-xs">
            <span>{t("nearDefinition")}</span>
            <span>{t("emptyExcluded", { count: impact.emptyAccounts })}</span>
          </div>
        </section>

        <aside className="bg-card overflow-hidden rounded-xl border border-dashed border-sky-400/70">
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{t("scenarioTitle")}</h2>
              <span className="rounded-md border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                {t("simulated")}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("scenarioDescription")}
            </p>
          </div>

          <div className="space-y-1 p-4">
            <p className="text-sm font-semibold">{t("accountsNearOrAbove")}</p>
            <p className="text-3xl font-bold tabular-nums">
              {impact.nearOrAboveAny}
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {t("nearOrAboveDetail", {
                pct: impactPct,
                near: impact.nearAny,
                above: impact.aboveAny,
              })}
            </p>
          </div>

          <div className="space-y-3 border-t p-4">
            <div>
              <p className="text-sm font-semibold">{t("pricingTitle")}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {t("pricingDescription")}
              </p>
            </div>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">
                {t("monthlyInfrastructureCost")}
              </span>
              <span className="relative block">
                <span className="text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2">
                  €
                </span>
                <input
                  type="number"
                  aria-label={t("monthlyInfrastructureCost")}
                  min={0}
                  step="0.01"
                  value={monthlyCostInput}
                  onChange={(event) => setMonthlyCostInput(event.target.value)}
                  className="h-11 w-full rounded-md border bg-transparent pr-3 pl-7 text-base tabular-nums sm:h-9 sm:pr-2 sm:pl-6 sm:text-sm"
                />
              </span>
            </label>
            <p className="text-muted-foreground -mt-1 text-xs tabular-nums">
              {costPerCreator !== null
                ? t("costPerActiveCreatorContext", {
                    cost: formatCurrency(costPerCreator),
                  })
                : t("enterMonthlyCost")}
            </p>
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              {(["paidAdoption", "costBuffer"] as const).map((key) => (
                <label key={key} className="space-y-1 text-xs">
                  <span className="text-muted-foreground">{t(key)}</span>
                  <span className="relative block">
                    <input
                      type="number"
                      aria-label={t(key)}
                      min={key === "paidAdoption" ? 0.1 : 0}
                      max={100}
                      step="0.5"
                      value={pricingAssumptions[key]}
                      onChange={(event) =>
                        setPricingAssumptions((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-md border bg-transparent pr-7 pl-3 text-base tabular-nums sm:h-9 sm:pr-6 sm:pl-2 sm:text-sm"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2">
                      %
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="bg-muted/45 rounded-lg p-3">
              <p className="text-muted-foreground text-xs">{t("priceFloor")}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {costCoverageEstimate
                  ? formatCurrency(
                      costCoverageEstimate.costCoveringPricePerPaidCreator
                    )
                  : t("notAvailable")}
              </p>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                {costCoverageEstimate
                  ? t("pricingContext", {
                      paid: new Intl.NumberFormat(locale, {
                        maximumFractionDigits: 1,
                      }).format(costCoverageEstimate.expectedPaidCreators),
                      breakEven: formatCurrency(
                        costCoverageEstimate.breakEvenPerPaidCreator
                      ),
                    })
                  : t("enterMonthlyCost")}
              </p>
              <p className="text-muted-foreground mt-1 text-[0.65rem]">
                {t("perMonthExTax")}
              </p>
            </div>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">{t("costSource")}</span>
              <input
                type="text"
                aria-label={t("costSource")}
                value={costSource}
                onChange={(event) => setCostSource(event.target.value)}
                placeholder={t("costSourcePlaceholder")}
                className="h-11 w-full rounded-md border bg-transparent px-3 text-base sm:h-9 sm:px-2 sm:text-sm"
              />
            </label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {costSource.trim()
                ? t("derivedCostSource", { source: costSource.trim() })
                : t("missingCostSource")}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("pricingAssumption")}
            </p>
          </div>

          <details className="group border-t p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              {t("behaviorAdvanced")}
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {t("behaviorAssumption")}
              </p>
              <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                {(["lower", "upper"] as const).map((key) => (
                  <label key={key} className="space-y-1 text-xs">
                    <span className="text-muted-foreground">{t(key)}</span>
                    <span className="relative block">
                      <input
                        type="number"
                        aria-label={t(key)}
                        step="0.5"
                        value={behaviorRange[key]}
                        onChange={(event) =>
                          setBehaviorRange((previous) => ({
                            ...previous,
                            [key]: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-md border bg-transparent pr-7 pl-3 text-base tabular-nums sm:h-9 sm:pr-6 sm:pl-2 sm:text-sm"
                      />
                      <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2">
                        %
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {t("creatorRange", {
                  lower: creatorRange[0],
                  upper: creatorRange[1],
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("directionalOnly")}
              </p>
            </div>
          </details>
        </aside>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-dashed px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold">{t("commercialTitle")}</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("commercialDescription")}
          </p>
        </div>
        <div className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          {["conversion", "upgrades", "downgrades", "churn"].map((key) => (
            <span key={key}>{t(key)}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
