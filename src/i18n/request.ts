import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isValidLocale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import enEditor from "../../messages/en/editor.json";
import nlEditor from "../../messages/nl/editor.json";

const messages = {
  en: { editor: enEditor },
  nl: { editor: nlEditor },
} as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isValidLocale(raw) ? raw : defaultLocale;

  return {
    locale,
    messages: messages[locale] ?? messages[defaultLocale],
  };
});
