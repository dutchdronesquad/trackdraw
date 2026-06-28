"use client";

import { Languages } from "lucide-react";
import { useLocaleStore } from "@/store/locale";
import { supportedLocales, type SupportedLocale } from "@/lib/i18n/locales";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const router = useRouter();
  const config = localeConfig[locale];

  function handleChange(value: string) {
    if (value === locale) return;
    setLocale(value as SupportedLocale);
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
          aria-label="Language"
        >
          <Languages className="size-3.5 shrink-0" />
          <span className="font-mono">{config.abbr}</span>
        </SelectTrigger>
      ) : (
        <SelectTrigger
          className={cn("h-8 rounded-lg px-2.5 text-sm shadow-none", className)}
          aria-label="Language"
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
