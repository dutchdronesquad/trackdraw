import "server-only";

import * as en from "@lang/en";
import * as nl from "@lang/nl";
import { defaultLocale, type SupportedLocale } from "@/lib/i18n/locales";

const catalogs = { en, nl } as const;

export type MessageNamespace = keyof typeof en;

export function getMessagesForLocale(locale: SupportedLocale) {
  return catalogs[locale] ?? catalogs[defaultLocale];
}

export function pickMessages(
  locale: SupportedLocale,
  namespaces: readonly MessageNamespace[]
) {
  const catalog = getMessagesForLocale(locale);

  return Object.fromEntries(
    namespaces.map((namespace) => [namespace, catalog[namespace]])
  );
}
