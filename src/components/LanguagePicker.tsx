"use client";

import { useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import { useLocaleStore } from "@/store/locale";
import {
  defaultLocale,
  isValidLocale,
  supportedLocales,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const localeConfig: Record<SupportedLocale, { label: string; abbr: string }> = {
  en: { label: "English", abbr: "EN" },
  nl: { label: "Nederlands", abbr: "NL" },
  de: { label: "Deutsch", abbr: "DE" },
  zh: { label: "简体中文", abbr: "ZH" },
};

function LocaleBadge({ abbr }: { abbr: string }) {
  return (
    <span
      aria-hidden="true"
      className="bg-foreground text-background inline-flex h-5 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold shadow-xs"
    >
      {abbr}
    </span>
  );
}

interface LanguagePickerProps {
  className?: string;
  variant?: "compact" | "full";
}

export function LanguagePicker({
  className,
  variant = "compact",
}: LanguagePickerProps) {
  // useSyncExternalStore with a server snapshot ensures SSR renders defaultLocale,
  // matching the Zustand store's initial state before localStorage rehydration.
  const rawLocale = useSyncExternalStore(
    useLocaleStore.subscribe,
    () => useLocaleStore.getState().locale,
    () => defaultLocale
  );
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const setLocale = useLocaleStore((s) => s.setLocale);
  const router = useRouter();
  const t = useTranslations("common");
  const config = localeConfig[locale];

  function handleChange(value: string) {
    if (value === locale) return;
    if (!isValidLocale(value)) return;
    setLocale(value);
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      {variant === "compact" ? (
        <SelectTrigger
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground h-8 min-w-12 justify-center gap-1.5 rounded-md border-0 px-2 text-xs shadow-none [&>svg:last-child]:hidden",
            className
          )}
          aria-label={t("labels.language")}
        >
          <Languages className="size-3.5 shrink-0" />
          <span className="font-mono">{config.abbr}</span>
        </SelectTrigger>
      ) : (
        <SelectTrigger
          className={cn(
            "h-8 justify-center gap-2 rounded-lg px-2.5 text-sm shadow-none [&>svg:last-child]:hidden",
            className
          )}
          aria-label={t("labels.language")}
        >
          <div className="flex min-w-0 items-center gap-2">
            <LocaleBadge abbr={config.abbr} />
            <span className="truncate">{config.label}</span>
          </div>
        </SelectTrigger>
      )}
      <SelectContent>
        {supportedLocales.map((l) => (
          <SelectItem key={l} value={l}>
            <span className="flex items-center gap-2">
              <LocaleBadge abbr={localeConfig[l].abbr} />
              {localeConfig[l].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
