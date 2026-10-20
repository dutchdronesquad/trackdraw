"use client";

import { forwardRef, useId, useMemo, useRef, useState } from "react";
import MetricsTooltipCard from "@/components/dashboard/MetricsTooltipCard";
import ToneBadge from "@/components/dashboard/ToneBadge";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, ChevronRight } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ComposedChart,
  ReferenceLine,
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
  isNearLimit,
} from "@/lib/metrics-planning";
import type { AdminMetrics, GrowthByRange } from "@/lib/server/metrics";
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

  return <MetricsTooltipCard label={label} rows={rows} />;
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

const SEGMENTED_RANGES = ["3m", "6m", "12m", "ytd"] as const;

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
  segmented = false,
}: {
  activeRange: GrowthRange;
  customRange: GrowthCustomRange | null;
  today: string;
  onPresetSelect: (range: GrowthPresetRange) => void;
  onCustomApply: (range: GrowthCustomRange) => void;
  segmented?: boolean;
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
          {segmented ? (
            <div
              role="group"
              aria-label={t("picker.range")}
              className="bg-muted text-muted-foreground inline-flex h-9 items-center gap-0.5 rounded-[10px] p-1"
            >
              {SEGMENTED_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  aria-pressed={activeRange === range}
                  aria-label={t(`ranges.${range}`)}
                  onClick={() => onPresetSelect(range)}
                  className={cn(
                    "focus-visible:ring-ring h-full rounded-[7px] px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    activeRange === range
                      ? "bg-background text-foreground shadow-sm"
                      : "hover:text-foreground"
                  )}
                >
                  {t(`rangesShort.${range}`)}
                </button>
              ))}
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-pressed={activeRange === "custom"}
                  aria-label={`${t("picker.range")} ${triggerLabel}`}
                  className={cn(
                    "focus-visible:ring-ring data-[state=open]:text-foreground inline-flex h-full max-w-[14rem] items-center gap-1.5 rounded-[7px] px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    activeRange === "custom" ||
                      !SEGMENTED_RANGES.includes(
                        activeRange as (typeof SEGMENTED_RANGES)[number]
                      )
                      ? "bg-background text-foreground shadow-sm"
                      : "hover:text-foreground"
                  )}
                >
                  <span className="truncate">
                    {activeRange === "custom" && customRange
                      ? triggerLabel
                      : t("picker.customShort")}
                  </span>
                </button>
              </PopoverTrigger>
            </div>
          ) : (
            <PopoverTrigger asChild>
              <RangePickerTrigger label={triggerLabel} />
            </PopoverTrigger>
          )}
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
  hideHeading = false,
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
  hideHeading?: boolean;
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
      <div
        className={cn(
          "flex items-start justify-between gap-3",
          hideHeading && !showRangePicker && "hidden"
        )}
      >
        <div className={cn("min-w-0 space-y-0.5", hideHeading && "sr-only")}>
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
    <div className="bg-card min-w-0 rounded-lg border p-4 sm:p-5">
      {content}
    </div>
  );
}

// --- Plan limit simulator ---

const CANDIDATE_LIMIT_MAX = 20;
const HISTOGRAM_OVERFLOW_BUCKET = CANDIDATE_LIMIT_MAX + 1;

const SAFE_COLOR = "var(--chart-1)";
const NEAR_COLOR = "#f59e0b";
const AFFECTED_COLOR = "var(--destructive)";

type DistRow = [number, number, number];
type PlanResource = "projects" | "shares" | "presets";

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

function LimitControl({
  resource,
  limit,
  onLimitChange,
}: {
  resource: PlanResource;
  limit: number;
  onLimitChange: (v: number) => void;
}) {
  const t = useTranslations("dashboard.metrics.planLimit");
  const rangeId = useId();
  const title = t(`resourceNames.${resource}`);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={rangeId}>{t(`controlLabels.${resource}`)}</label>
        <span className="font-semibold tabular-nums" aria-hidden="true">
          {limit}
        </span>
      </div>
      <input
        id={rangeId}
        type="range"
        min={1}
        max={CANDIDATE_LIMIT_MAX}
        value={limit}
        aria-label={t("rangeLabel", { resource: title })}
        aria-valuetext={t("limitExplanation", { limit })}
        onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        className="accent-brand-primary h-5 w-full cursor-pointer"
      />
    </div>
  );
}

function ResourceHistogram({
  resource,
  counts,
  limit,
}: {
  resource: PlanResource;
  counts: number[];
  limit: number;
}) {
  const t = useTranslations("dashboard.metrics.planLimit");
  const resourceName = t(`resourceNames.${resource}`).toLowerCase();
  const distConfig = {
    users: { label: t("usersAxis"), color: SAFE_COLOR },
  } satisfies ChartConfig;
  const histogram = useMemo(
    () => buildHistogram(counts).filter((entry) => entry.bucket !== 0),
    [counts]
  );

  return (
    <ChartContainer config={distConfig} className="aspect-auto h-56 w-full">
      <BarChart
        accessibilityLayer
        data={histogram}
        margin={{ left: 0, right: 8, top: 20, bottom: 0 }}
        barCategoryGap="14%"
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          allowDecimals={false}
          width={32}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload }) => {
            const entry = payload?.[0]?.payload as
              (typeof histogram)[number] | undefined;
            if (!active || !entry) return null;
            return (
              <MetricsTooltipCard
                label={t("withCount", {
                  qualifier:
                    entry.bucket === HISTOGRAM_OVERFLOW_BUCKET
                      ? ""
                      : t("withExactly"),
                  count: entry.label,
                  resource: resourceName,
                })}
                rows={[
                  {
                    key: "users",
                    label: t("usersAxis"),
                    value: entry.users,
                  },
                ]}
              />
            );
          }}
        />
        <ReferenceLine
          x={String(limit)}
          stroke="var(--foreground)"
          strokeDasharray="4 3"
          label={{
            value: t("limitMarker", { limit }),
            position: "insideTopRight",
            fontSize: 12,
            fontWeight: 500,
            fill: "var(--foreground)",
          }}
        />
        <Bar dataKey="users" radius={3}>
          {histogram.map((entry) => (
            <Cell
              key={entry.bucket}
              fill={
                entry.bucket > limit
                  ? AFFECTED_COLOR
                  : isNearLimit(entry.bucket, limit)
                    ? NEAR_COLOR
                    : SAFE_COLOR
              }
            />
          ))}
          <LabelList
            dataKey="users"
            position="top"
            fontSize={12}
            fontWeight={500}
            className="fill-foreground"
            formatter={(value) => (Number(value) > 0 ? String(value) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function PlanStatStrip({
  items,
}: {
  items: Array<{
    key: string;
    value: string | number;
    label: string;
    tone?: "destructive" | "amber" | "muted";
  }>;
}) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex flex-col-reverse border-b px-4 py-3.5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
        >
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd
            className={cn(
              "text-2xl leading-8 font-semibold tabular-nums",
              item.tone === "destructive" && "text-destructive",
              item.tone === "amber" && "text-amber-700 dark:text-amber-300",
              item.tone === "muted" && "text-muted-foreground"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const planInputClassName =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-[10px] border bg-transparent px-3 text-sm tabular-nums outline-none focus-visible:ring-[3px]";

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
  const [focusResource, setFocusResource] = useState<PlanResource>("projects");
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
  const counts = useMemo(
    () => ({
      projects: activeDistribution.map((r) => r[0]),
      shares: activeDistribution.map((r) => r[1]),
      presets: activeDistribution.map((r) => r[2]),
    }),
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
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(value);
  const sharePercent = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  if (userDistribution.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {t("noData")}
      </div>
    );
  }

  const resources: PlanResource[] = ["projects", "shares", "presets"];
  const focused = impact.resources[focusResource];
  const focusedLimit = limits[focusResource];
  const paidAdoption = Number(pricingAssumptions.paidAdoption) || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <section
          aria-labelledby="plan-limits-title"
          className="bg-card min-w-0 flex-[1_1_300px] overflow-hidden rounded-lg border"
        >
          <div className="border-b px-4 py-3.5">
            <h2
              id="plan-limits-title"
              className="text-base leading-6 font-semibold"
            >
              {t("title")}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm leading-5">
              {t("controlsDescription")}
            </p>
          </div>
          <div className="flex flex-col gap-5 p-4">
            {resources.map((resource) => (
              <LimitControl
                key={resource}
                resource={resource}
                limit={limits[resource]}
                onLimitChange={(v) => {
                  setLimits((prev) => ({ ...prev, [resource]: v }));
                  setFocusResource(resource);
                }}
              />
            ))}
            <p className="text-muted-foreground text-xs leading-[18px]">
              {t("nearDefinition")}{" "}
              {t("emptyExcluded", { count: impact.emptyAccounts })}
            </p>
          </div>
          <div className="flex flex-col gap-2 border-t p-4">
            <label htmlFor="plan-monthly-cost" className="text-sm font-medium">
              {t("monthlyInfrastructureCost")}
            </label>
            <span className="relative block">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                €
              </span>
              <input
                id="plan-monthly-cost"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={monthlyCostInput}
                onChange={(event) => setMonthlyCostInput(event.target.value)}
                className={cn(planInputClassName, "pl-7")}
              />
            </span>
            <p className="text-muted-foreground text-xs leading-[18px]">
              {t("costHelp")}
            </p>
          </div>
        </section>

        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          <section
            aria-labelledby="plan-impact-title"
            className="bg-card min-w-0 overflow-hidden rounded-lg border"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3.5">
              <h2
                id="plan-impact-title"
                className="text-base leading-6 font-semibold"
              >
                {t("impactTitle", {
                  limit: focusedLimit,
                  resource: t(`resourceSingular.${focusResource}`),
                })}
              </h2>
              <ToneBadge tone="sky">{t("simulated")}</ToneBadge>
            </div>
            <div className="border-b">
              <PlanStatStrip
                items={[
                  {
                    key: "above",
                    value: focused.above,
                    label: t("accountsAbove"),
                    tone: focused.above > 0 ? "destructive" : undefined,
                  },
                  {
                    key: "near",
                    value: focused.near,
                    label: t("accountsNear"),
                    tone: focused.near > 0 ? "amber" : undefined,
                  },
                  {
                    key: "share",
                    value: sharePercent.format(
                      totalUsers ? focused.above / totalUsers : 0
                    ),
                    label: t("accountsAffectedShare"),
                  },
                ]}
              />
            </div>
            <div className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  {t("distributionCaption", {
                    resource: t(`resourceNames.${focusResource}`).toLowerCase(),
                  })}
                </p>
                <div
                  role="group"
                  aria-label={t("distributionFor")}
                  className="bg-muted inline-flex h-8 items-center gap-0.5 rounded-lg p-1"
                >
                  {resources.map((resource) => (
                    <button
                      key={resource}
                      type="button"
                      aria-pressed={focusResource === resource}
                      onClick={() => setFocusResource(resource)}
                      className={cn(
                        "text-muted-foreground h-6 cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors",
                        focusResource === resource &&
                          "bg-background text-foreground shadow-sm"
                      )}
                    >
                      {t(`resourceNames.${resource}`)}
                    </button>
                  ))}
                </div>
              </div>
              <ResourceHistogram
                key={focusResource}
                resource={focusResource}
                counts={counts[focusResource]}
                limit={focusedLimit}
              />
            </div>
          </section>

          <section
            aria-labelledby="plan-pricing-title"
            className="bg-card min-w-0 overflow-hidden rounded-lg border"
          >
            <div className="border-b px-4 py-3.5">
              <h2
                id="plan-pricing-title"
                className="text-base leading-6 font-semibold"
              >
                {t("pricingTitle")}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm leading-5">
                {t("pricingDescription")}
              </p>
            </div>
            <PlanStatStrip
              items={[
                {
                  key: "perCreator",
                  value:
                    costPerCreator !== null
                      ? formatCurrency(costPerCreator)
                      : "—",
                  label: t("costPerActiveCreator"),
                  tone: costPerCreator === null ? "muted" : undefined,
                },
                {
                  key: "adoption",
                  value: `${paidAdoption}%`,
                  label: t("assumedPaidAdoption"),
                },
                {
                  key: "floor",
                  value: costCoverageEstimate
                    ? formatCurrency(
                        costCoverageEstimate.costCoveringPricePerPaidCreator
                      )
                    : "—",
                  label: t("priceFloorLabel"),
                  tone: costCoverageEstimate ? undefined : "muted",
                },
              ]}
            />
            <p className="text-muted-foreground border-t px-4 py-2.5 text-xs tabular-nums">
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
            <details className="group border-t">
              <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {t("behaviorAdvanced")}
                <ChevronRight
                  className="size-4 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                {(["paidAdoption", "costBuffer"] as const).map((key) => (
                  <label key={key} className="flex flex-col gap-1.5 text-xs">
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
                        className={cn(planInputClassName, "pr-7")}
                      />
                      <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                        %
                      </span>
                    </span>
                  </label>
                ))}
                <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                  <span className="text-muted-foreground">
                    {t("costSource")}
                  </span>
                  <input
                    type="text"
                    aria-label={t("costSource")}
                    value={costSource}
                    onChange={(event) => setCostSource(event.target.value)}
                    placeholder={t("costSourcePlaceholder")}
                    className={planInputClassName}
                  />
                  <span className="text-muted-foreground leading-relaxed">
                    {costSource.trim()
                      ? t("derivedCostSource", { source: costSource.trim() })
                      : t("missingCostSource")}
                  </span>
                </label>
                <p className="text-muted-foreground text-xs leading-relaxed sm:col-span-2">
                  {t("pricingAssumption")}
                </p>
                <div className="flex flex-col gap-2 border-t pt-4 sm:col-span-2">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("behaviorAssumption")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(["lower", "upper"] as const).map((key) => (
                      <label
                        key={key}
                        className="flex flex-col gap-1.5 text-xs"
                      >
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
                            className={cn(planInputClassName, "pr-7")}
                          />
                          <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
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
              </div>
            </details>
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-dashed px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
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
