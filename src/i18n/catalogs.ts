import "server-only";

import * as en from "@lang/en";
import i18nPolicy from "@lang/i18n-policy.json";
import * as nl from "@lang/nl";
import { defaultLocale, type SupportedLocale } from "@/lib/i18n/locales";

export type MessageNamespace = keyof typeof en;

const englishOnlyNamespaceSet = new Set<MessageNamespace>(
  i18nPolicy.englishOnlyNamespaces as MessageNamespace[]
);

const catalogs: Record<
  SupportedLocale,
  Partial<Record<MessageNamespace, unknown>>
> = { en, nl };

const catalogNamespaces = Object.keys(en) as MessageNamespace[];
const catalogCache = new Map<
  SupportedLocale,
  Record<MessageNamespace, unknown>
>();

function getNamespaceMessages(
  locale: SupportedLocale,
  namespace: MessageNamespace
) {
  if (englishOnlyNamespaceSet.has(namespace)) {
    return en[namespace];
  }

  const catalog = catalogs[locale] ?? catalogs[defaultLocale];
  return catalog[namespace] ?? en[namespace];
}

export function getCatalogForLocale(locale: SupportedLocale) {
  const cachedCatalog = catalogCache.get(locale);
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const catalog = Object.fromEntries(
    catalogNamespaces.map((namespace) => [
      namespace,
      getNamespaceMessages(locale, namespace),
    ])
  ) as Record<MessageNamespace, unknown>;
  catalogCache.set(locale, catalog);
  return catalog;
}

export function pickCatalogNamespaces(
  locale: SupportedLocale,
  namespaces: readonly MessageNamespace[]
) {
  return Object.fromEntries(
    namespaces.map((namespace) => [
      namespace,
      getNamespaceMessages(locale, namespace),
    ])
  );
}
