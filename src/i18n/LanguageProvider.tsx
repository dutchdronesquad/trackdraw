import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { normalizeLocale } from "@/lib/i18n/locales";
import { pickCatalogNamespaces, type MessageNamespace } from "@/i18n/catalogs";

type LanguageProviderProps = {
  namespaces: readonly MessageNamespace[];
  children: React.ReactNode;
};

export default async function LanguageProvider({
  namespaces,
  children,
}: LanguageProviderProps) {
  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const messages = await pickCatalogNamespaces(locale, namespaces);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
