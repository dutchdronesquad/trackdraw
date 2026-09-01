"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import AuditDateRangeFilter from "@/components/dashboard/AuditDateRangeFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const allFilterValue = "__all__";

export type AuditFilterOption = {
  value: string;
  label: string;
  category?: string;
  group?: string;
};

type ActiveAuditFilter = {
  key: string;
  label: string;
  href: string;
};

type AuditFilterLabels = {
  title: string;
  search: string;
  searchPlaceholder: string;
  range: string;
  category: string;
  event: string;
  actor: string;
  target: string;
  dateRange: string;
  chooseDates: string;
  clearDates: string;
  applyDateRange: string;
  clearAll: string;
  moreFilters: string;
  filterDetails: string;
  searchOptions: string;
  noOptions: string;
  removeFilter: string;
};

type AuditFilterValues = {
  search?: string;
  range: string;
  category: string;
  event: string;
  actor: string;
  target: string;
  from?: string;
  to?: string;
};

function auditFiltersHref(values: AuditFilterValues) {
  const params = new URLSearchParams();
  const effectiveRange =
    values.range === "custom" &&
    (!values.from || !values.to || values.from > values.to)
      ? "30d"
      : values.range;
  const normalizedSearch = values.search?.trim();
  if (normalizedSearch) params.set("q", normalizedSearch);
  if (effectiveRange !== "30d") params.set("range", effectiveRange);
  if (values.category !== allFilterValue) {
    params.set("category", values.category);
  }
  if (values.event !== allFilterValue) params.set("event", values.event);
  if (values.actor !== allFilterValue) params.set("actor", values.actor);
  if (values.target !== allFilterValue) params.set("target", values.target);
  if (effectiveRange === "custom" && values.from && values.to) {
    params.set("from", values.from);
    params.set("to", values.to);
  }

  const query = params.toString();
  return query ? `/dashboard/audit?${query}` : "/dashboard/audit";
}

function FilterField({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="text-foreground block h-4 text-xs leading-4 font-medium"
      >
        {label}
      </label>
      <div className="h-9">{children}</div>
    </div>
  );
}

function SelectFilter({
  id,
  label,
  value,
  options,
  className,
  disabled,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  options: AuditFilterOption[];
  className?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  return (
    <FilterField id={id} label={label} className={className}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={label} className="bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

function FilterCombobox({
  id,
  label,
  value,
  options,
  className,
  searchLabel,
  noOptionsLabel,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  options: AuditFilterOption[];
  className?: string;
  searchLabel: string;
  noOptionsLabel: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const visibleOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  let previousGroup: string | undefined;

  return (
    <FilterField id={id} label={label} className={className}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={`${id}-options`}
            disabled={options.length <= 1}
            className="bg-background w-full justify-between px-3 font-normal shadow-sm"
          >
            <span className="truncate">{selected?.label}</span>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
        >
          <div className="border-b p-2">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(inputEvent) => setQuery(inputEvent.target.value)}
                aria-label={`${searchLabel}: ${label}`}
                placeholder={searchLabel}
                className="h-8 pl-8"
                autoFocus
              />
            </div>
          </div>
          <div
            id={`${id}-options`}
            role="listbox"
            aria-label={label}
            className="max-h-72 overflow-y-auto p-1"
          >
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const showGroup = Boolean(
                  option.group && option.group !== previousGroup
                );
                previousGroup = option.group;
                return (
                  <div key={option.value}>
                    {showGroup ? (
                      <p className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">
                        {option.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      className="hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none"
                      onClick={() => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          option.value === value ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate">{option.label}</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                {noOptionsLabel}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </FilterField>
  );
}

function SecondaryFilters({
  idPrefix,
  labels,
  category,
  event,
  actor,
  target,
  categoryOptions,
  eventOptions,
  actorOptions,
  targetOptions,
  onCategoryChange,
  onEventChange,
  onActorChange,
  onTargetChange,
}: {
  idPrefix: string;
  labels: AuditFilterLabels;
  category: string;
  event: string;
  actor: string;
  target: string;
  categoryOptions: AuditFilterOption[];
  eventOptions: AuditFilterOption[];
  actorOptions: AuditFilterOption[];
  targetOptions: AuditFilterOption[];
  onCategoryChange: (value: string) => void;
  onEventChange: (value: string) => void;
  onActorChange: (value: string) => void;
  onTargetChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SelectFilter
        id={`${idPrefix}-category`}
        label={labels.category}
        value={category}
        options={categoryOptions}
        disabled={categoryOptions.length <= 1}
        onValueChange={onCategoryChange}
      />
      <SelectFilter
        id={`${idPrefix}-event`}
        label={labels.event}
        value={event}
        options={eventOptions}
        disabled={eventOptions.length <= 1}
        onValueChange={onEventChange}
      />
      <FilterCombobox
        id={`${idPrefix}-actor`}
        label={labels.actor}
        value={actor}
        options={actorOptions}
        searchLabel={labels.searchOptions}
        noOptionsLabel={labels.noOptions}
        onValueChange={onActorChange}
      />
      <FilterCombobox
        id={`${idPrefix}-target`}
        label={labels.target}
        value={target}
        options={targetOptions}
        searchLabel={labels.searchOptions}
        noOptionsLabel={labels.noOptions}
        onValueChange={onTargetChange}
      />
    </div>
  );
}

export default function AuditFilters({
  values,
  labels,
  rangeOptions,
  categoryOptions,
  eventOptions,
  actorOptions,
  targetOptions,
  activeFilters,
  locale,
}: {
  values: AuditFilterValues;
  labels: AuditFilterLabels;
  rangeOptions: AuditFilterOption[];
  categoryOptions: AuditFilterOption[];
  eventOptions: AuditFilterOption[];
  actorOptions: AuditFilterOption[];
  targetOptions: AuditFilterOption[];
  activeFilters: ActiveAuditFilter[];
  locale: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(values.search ?? "");
  const [range, setRange] = useState(values.range);
  const [category, setCategory] = useState(values.category);
  const [event, setEvent] = useState(values.event);
  const [actor, setActor] = useState(values.actor);
  const [target, setTarget] = useState(values.target);
  const [from, setFrom] = useState(values.from ?? "");
  const [to, setTo] = useState(values.to ?? "");
  const usesCustomRange = range === "custom";
  const filteredEventOptions = useMemo(
    () =>
      eventOptions.filter(
        (option) =>
          option.value === allFilterValue ||
          category === allFilterValue ||
          option.category === category
      ),
    [category, eventOptions]
  );
  const secondaryFilterCount = [category, event, actor, target].filter(
    (value) => value !== allFilterValue
  ).length;
  const currentValues = {
    search,
    range,
    category,
    event,
    actor,
    target,
    from,
    to,
  };

  const navigate = useCallback(
    (nextValues: AuditFilterValues) => {
      startTransition(() => router.push(auditFiltersHref(nextValues)));
    },
    [router]
  );

  useEffect(() => {
    if (search === (values.search ?? "")) return;

    const timeout = window.setTimeout(() => {
      navigate({ ...currentValues, search });
    }, 400);

    return () => window.clearTimeout(timeout);
    // Other filter changes navigate through their event handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, values.search, navigate]);

  function updateCategory(nextCategory: string) {
    setCategory(nextCategory);
    const selectedEvent = eventOptions.find((option) => option.value === event);
    let nextEvent = event;
    if (
      event !== allFilterValue &&
      nextCategory !== allFilterValue &&
      selectedEvent?.category !== nextCategory
    ) {
      nextEvent = allFilterValue;
      setEvent(allFilterValue);
    }
    navigate({ ...currentValues, category: nextCategory, event: nextEvent });
  }

  function applyFilters(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    navigate(currentValues);
  }

  const secondaryProps = {
    labels,
    category,
    event,
    actor,
    target,
    categoryOptions,
    eventOptions: filteredEventOptions,
    actorOptions,
    targetOptions,
    onCategoryChange: updateCategory,
    onEventChange: (nextEvent: string) => {
      setEvent(nextEvent);
      navigate({ ...currentValues, event: nextEvent });
    },
    onActorChange: (nextActor: string) => {
      setActor(nextActor);
      navigate({ ...currentValues, actor: nextActor });
    },
    onTargetChange: (nextTarget: string) => {
      setTarget(nextTarget);
      navigate({ ...currentValues, target: nextTarget });
    },
  };

  return (
    <div className="border-border/60 space-y-3 border-y py-4">
      <form
        action="/dashboard/audit"
        method="get"
        onSubmit={applyFilters}
        aria-labelledby="audit-filters-title"
        className="space-y-4"
      >
        <input type="hidden" name="range" value={range} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="event" value={event} />
        <input type="hidden" name="actor" value={actor} />
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="from" value={usesCustomRange ? from : ""} />
        <input type="hidden" name="to" value={usesCustomRange ? to : ""} />

        <div className="flex items-center justify-between gap-3">
          <h2 id="audit-filters-title" className="text-sm font-semibold">
            {labels.title}
          </h2>
          {activeFilters.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/audit" prefetch={false}>
                {labels.clearAll}
              </Link>
            </Button>
          ) : null}
        </div>

        <div
          className={cn(
            "grid items-end gap-3 md:grid-cols-2",
            usesCustomRange
              ? "xl:grid-cols-[minmax(12rem,1.6fr)_repeat(6,minmax(7rem,1fr))]"
              : "xl:grid-cols-[minmax(14rem,1.8fr)_repeat(5,minmax(8rem,1fr))]"
          )}
        >
          <FilterField
            id="audit-search"
            label={labels.search}
            className="md:col-span-2 xl:col-span-1"
          >
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="audit-search"
                type="search"
                name="q"
                value={search}
                onChange={(inputEvent) => setSearch(inputEvent.target.value)}
                placeholder={labels.searchPlaceholder}
                className="bg-background pl-9"
              />
            </div>
          </FilterField>
          <SelectFilter
            id="audit-range"
            label={labels.range}
            value={range}
            options={rangeOptions}
            onValueChange={(nextRange) => {
              setRange(nextRange);
              if (nextRange !== "custom" || (from && to && from <= to)) {
                navigate({ ...currentValues, range: nextRange });
              }
            }}
          />
          {usesCustomRange ? (
            <FilterField id="audit-date-range" label={labels.dateRange}>
              <AuditDateRangeFilter
                id="audit-date-range"
                from={from}
                to={to}
                label={labels.dateRange}
                placeholder={labels.chooseDates}
                clearLabel={labels.clearDates}
                applyLabel={labels.applyDateRange}
                locale={locale}
                onChange={(nextFrom, nextTo) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                  if (nextFrom && nextTo && nextFrom <= nextTo) {
                    navigate({
                      ...currentValues,
                      range: "custom",
                      from: nextFrom,
                      to: nextTo,
                    });
                  } else {
                    setRange("30d");
                    navigate({
                      ...currentValues,
                      range: "30d",
                      from: "",
                      to: "",
                    });
                  }
                }}
              />
            </FilterField>
          ) : null}
          <SelectFilter
            id="audit-category"
            label={labels.category}
            value={category}
            options={categoryOptions}
            className="hidden md:block"
            disabled={categoryOptions.length <= 1}
            onValueChange={updateCategory}
          />
          <SelectFilter
            id="audit-event"
            label={labels.event}
            value={event}
            options={filteredEventOptions}
            className="hidden md:block"
            disabled={filteredEventOptions.length <= 1}
            onValueChange={secondaryProps.onEventChange}
          />
          <FilterCombobox
            id="audit-actor"
            label={labels.actor}
            value={actor}
            options={actorOptions}
            className="hidden md:block"
            searchLabel={labels.searchOptions}
            noOptionsLabel={labels.noOptions}
            onValueChange={secondaryProps.onActorChange}
          />
          <FilterCombobox
            id="audit-target"
            label={labels.target}
            value={target}
            options={targetOptions}
            className="hidden md:block"
            searchLabel={labels.searchOptions}
            noOptionsLabel={labels.noOptions}
            onValueChange={secondaryProps.onTargetChange}
          />
        </div>

        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  {labels.moreFilters}
                </span>
                {secondaryFilterCount > 0 ? (
                  <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs">
                    {secondaryFilterCount}
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col p-0 sm:max-w-sm">
              <SheetHeader className="border-b p-5 text-left">
                <SheetTitle>{labels.moreFilters}</SheetTitle>
                <SheetDescription>{labels.filterDetails}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5">
                <SecondaryFilters idPrefix="audit-mobile" {...secondaryProps} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </form>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label={labels.title}>
          {activeFilters.map((filter) => (
            <Link
              key={filter.key}
              href={filter.href}
              prefetch={false}
              aria-label={`${labels.removeFilter}: ${filter.label}`}
              className="bg-muted text-muted-foreground hover:bg-muted/70 focus-visible:ring-ring inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2"
            >
              <span className="truncate">{filter.label}</span>
              <X className="size-3" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
