"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  Eye,
  Layers,
  Link2,
  Pencil,
  Upload,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ToneBadge from "@/components/dashboard/ToneBadge";
import type { YearInNumbers, YearNumberMetric } from "@/lib/year-in-numbers";

const icons = {
  elements: Layers,
  exports: Upload,
  sessions: Pencil,
  shares: Link2,
  views: Eye,
  accounts: UserRound,
} satisfies Record<YearNumberMetric, typeof Layers>;

export function YearInNumbersView({
  report,
  currentYear,
}: {
  report: YearInNumbers;
  currentYear: number;
}) {
  const t = useTranslations("dashboard.yearInNumbers");
  const locale = useLocale();
  const router = useRouter();
  const [recapOpen, setRecapOpen] = useState(false);
  const format = new Intl.NumberFormat(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const date = (day: string) =>
    dateFormat.format(new Date(`${day.slice(0, 10)}T00:00:00Z`));
  const measuredDays = new Set(report.coverageDays);
  const sortedDays = [...measuredDays].sort();
  const from = sortedDays[0];
  const to = sortedDays.at(-1);
  const partial =
    report.yearToDate || measuredDays.size !== report.metrics[0].expectedDays;
  const period =
    from && to
      ? t("recordedPeriod", { from: date(from), to: date(to) })
      : t("noRecordedPeriod");
  const reportable = report.metrics.filter((row) => row.total !== null);
  const monthFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-5 pt-3 sm:pt-5">
        <div>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-3 text-base">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:pt-4">
          <label htmlFor="report-year" className="sr-only">
            {t("year")}
          </label>
          <Select
            name="year"
            value={String(report.year)}
            onValueChange={(year) =>
              router.push(`/dashboard/metrics/year-in-numbers?year=${year}`)
            }
          >
            <SelectTrigger
              id="report-year"
              aria-label={t("year")}
              className="bg-background h-10 w-24"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                { length: currentYear - 2025 },
                (_, index) => currentYear - index
              ).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-10 px-5"
            onClick={() => setRecapOpen(true)}
          >
            {t("viewRecap")}
          </Button>
        </div>
      </header>

      <section
        aria-label={t("measurementCoverage")}
        className="flex flex-col gap-5 border-b py-6 sm:py-8 xl:flex-row xl:items-center xl:gap-8"
      >
        <span className="text-6xl leading-none font-semibold tracking-tight sm:text-7xl">
          {report.year}
        </span>
        <div className="min-w-0 flex-1 space-y-3 xl:border-l xl:pl-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <ToneBadge tone={partial ? "amber" : "neutral"}>
              {t(partial ? "partialYear" : "calendarYear")}
            </ToneBadge>
            <span>{period}</span>
          </div>
          <div
            className="grid grid-cols-12 gap-px overflow-hidden rounded-md"
            aria-label={period}
          >
            {Array.from({ length: 12 }, (_, month) => {
              const days = new Date(
                Date.UTC(report.year, month + 1, 0)
              ).getUTCDate();
              return (
                <div key={month} className="relative min-w-0">
                  <div className="flex h-8" aria-hidden="true">
                    {Array.from({ length: days }, (_, index) => {
                      const day = `${report.year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
                      return (
                        <span
                          key={day}
                          className={`flex-1 ${measuredDays.has(day) ? "bg-amber-100 dark:bg-amber-950" : "bg-muted"}`}
                        />
                      );
                    })}
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs">
                    {monthFormat.format(
                      new Date(Date.UTC(report.year, month, 1))
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="-mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {report.metrics.map((row, index) => {
          const Icon = icons[row.metric];
          return (
            <section
              key={row.metric}
              aria-label={t(`labels.${row.metric}`)}
              className={`relative border-b px-2 py-7 sm:px-6 sm:py-8 ${index % 2 === 0 ? "sm:border-r" : ""} ${index % 3 === 2 ? "xl:border-r-0" : "xl:border-r"} xl:py-7`}
            >
              <Icon className="mb-4 size-10 stroke-[1.5]" aria-hidden="true" />
              <p className="text-5xl leading-none font-semibold tracking-tight tabular-nums sm:text-6xl">
                {row.total === null ? "—" : format.format(row.total)}
              </p>
              <h2 className="mt-2 text-lg leading-snug font-medium sm:text-xl">
                {t(`labels.${row.metric}`)}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {t(
                  row.status === "unavailable"
                    ? "status.unavailable"
                    : row.metric === "accounts"
                      ? "registrationActivity"
                      : "recordedActivity"
                )}
              </p>
              {row.reason && (
                <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-5">
                  {t(
                    row.reason === "noData" && row.metric === "accounts"
                      ? "noHistoricalAccounts"
                      : row.reason
                  )}
                </p>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-muted-foreground text-sm leading-6">
        {t("summaryLimits")}
      </p>
      <details className="group" open>
        <summary className="bg-muted/60 flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          {t("definitionsTitle")}
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="divide-y">
          {report.metrics.map((row) => {
            const Icon = icons[row.metric];
            return (
              <div
                key={row.metric}
                className="grid gap-x-5 gap-y-2 px-4 py-4 text-sm lg:grid-cols-[14rem_minmax(0,1fr)]"
              >
                <h3 className="flex items-center gap-3 font-medium">
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {t(`labels.${row.metric}`)}
                </h3>
                <div className="text-muted-foreground space-y-1 leading-6">
                  <p>{t(`definitions.${row.metric}`)}</p>
                  <p className="text-xs">
                    {row.from && row.to
                      ? t("coverage", {
                          from: row.from,
                          to: row.to,
                          days: row.days,
                          expected: row.expectedDays,
                        })
                      : t("noData")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground border-t px-4 py-4 text-xs leading-6">
          {t("limits")}
        </p>
      </details>
      {report.updatedAt && (
        <p className="text-muted-foreground border-t pt-4 text-xs">
          {t("updated", { at: date(report.updatedAt) })}
        </p>
      )}

      <Dialog open={recapOpen} onOpenChange={setRecapOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("recapTitle", { year: report.year })}</DialogTitle>
            <DialogDescription>{period}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <p className="text-2xl font-semibold tracking-tight">
              {t("recapHeading", { year: report.year })}
            </p>
            {reportable.length === 0 ? (
              <p className="text-muted-foreground">
                {t("noReportableFigures")}
              </p>
            ) : (
              <ul className="space-y-3">
                {reportable.map((row) => (
                  <li key={row.metric} className="space-y-1">
                    <p>
                      <strong className="tabular-nums">
                        {format.format(row.total!)}
                      </strong>{" "}
                      {t(`labels.${row.metric}`)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("coverage", {
                        from: row.from!,
                        to: row.to!,
                        days: row.days,
                        expected: row.expectedDays,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground text-sm leading-6">
              {t("summaryLimits")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
