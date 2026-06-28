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

const localeConfig: Record<
  SupportedLocale,
  { label: string; abbr: string; flag: string }
> = {
  en: { label: "English", abbr: "EN", flag: "🇬🇧" },
  nl: { label: "Nederlands", abbr: "NL", flag: "🇳🇱" },
};

interface LanguagePickerProps {
  className?: string;
  variant?: "compact" | "full";
}

export function LanguagePicker({
  className,
  variant = "compact",
}: LanguagePickerProps) {
  const t = useTranslations("editor");
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
            "text-muted-foreground hover:bg-muted hover:text-foreground h-8 gap-1.5 rounded-md border-0 px-2 text-xs shadow-none lg:h-7 lg:px-2",
            className
          )}
          aria-label={t("languagePicker.ariaLabel")}
        >
          <Languages className="size-3.5 shrink-0" />
          <span className="font-mono">{config.abbr}</span>
        </SelectTrigger>
      ) : (
        <SelectTrigger
          className={cn("h-8 rounded-lg px-2.5 text-sm shadow-none", className)}
          aria-label={t("languagePicker.ariaLabel")}
        >
          {config.flag} {config.label}
        </SelectTrigger>
      )}
      <SelectContent>
        {supportedLocales.map((l) => (
          <SelectItem key={l} value={l}>
            {localeConfig[l].flag} {localeConfig[l].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
