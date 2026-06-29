import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { defaultLocale, isValidLocale } from "@/lib/i18n/locales";
import { pickMessages, type MessageNamespace } from "@/i18n/messages";

type LanguageProviderProps = {
  namespaces: readonly MessageNamespace[];
  children: React.ReactNode;
};

export default async function LanguageProvider({
  namespaces,
  children,
}: LanguageProviderProps) {
  const rawLocale = await getLocale();
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, namespaces)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
