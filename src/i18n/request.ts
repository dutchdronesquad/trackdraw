import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  defaultLocale,
  getLocaleFromAcceptLanguage,
  isValidLocale,
} from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import * as en from "@lang/en";
import * as nl from "@lang/nl";

const messages = { en: { ...en }, nl: { ...nl } };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const requestHeaders = await headers();
  const locale = isValidLocale(raw)
    ? raw
    : getLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));

  return {
    locale,
    messages: messages[locale] ?? messages[defaultLocale],
  };
});
