"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  defaultLocale,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { useLocaleStore } from "@/store/locale";
import type { MessageNamespace } from "@/i18n/catalogs";
import i18nPolicy from "@lang/i18n-policy.json";

type Messages = Record<string, unknown>;

type ClientLanguageProviderProps = {
  namespaces: readonly MessageNamespace[];
  initialMessages: Messages;
  children: React.ReactNode;
};

async function loadMessages(
  locale: SupportedLocale,
  namespaces: readonly MessageNamespace[],
  initialMessages: Messages
): Promise<Messages> {
  const englishOnlyNamespaces = new Set(
    i18nPolicy.englishOnlyNamespaces as string[]
  );
  const entries = await Promise.all(
    namespaces.map(async (namespace) => {
      if (englishOnlyNamespaces.has(namespace)) {
        return [namespace, initialMessages[namespace]] as const;
      }

      const response = await fetch(`/locales/${locale}/${namespace}.json`);
      if (!response.ok) {
        throw new Error(
          `Could not load ${namespace} messages for locale ${locale}.`
        );
      }
      return [namespace, (await response.json()) as unknown] as const;
    })
  );

  return Object.fromEntries(entries);
}

export default function ClientLanguageProvider({
  namespaces,
  initialMessages,
  children,
}: ClientLanguageProviderProps) {
  const rawLocale = useSyncExternalStore(
    useLocaleStore.subscribe,
    () => useLocaleStore.getState().locale,
    () => defaultLocale
  );
  const requestedLocale = normalizeLocale(rawLocale);
  const [activeCatalog, setActiveCatalog] = useState({
    locale: defaultLocale,
    messages: initialMessages,
  });
  const initialMessagesRef = useRef(initialMessages);
  const namespacesKey = namespaces.join(",");

  useEffect(() => {
    let cancelled = false;
    const namespaceList = namespacesKey.split(",") as MessageNamespace[];

    if (requestedLocale === defaultLocale) {
      setActiveCatalog({
        locale: defaultLocale,
        messages: initialMessagesRef.current,
      });
      return () => {
        cancelled = true;
      };
    }

    void loadMessages(
      requestedLocale,
      namespaceList,
      initialMessagesRef.current
    ).then(
      (messages) => {
        if (!cancelled) {
          setActiveCatalog({ locale: requestedLocale, messages });
        }
      },
      () => {
        if (!cancelled) {
          setActiveCatalog({
            locale: defaultLocale,
            messages: initialMessagesRef.current,
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [namespacesKey, requestedLocale]);

  useEffect(() => {
    document.documentElement.lang = activeCatalog.locale;
  }, [activeCatalog.locale]);

  return (
    <NextIntlClientProvider
      locale={activeCatalog.locale}
      messages={activeCatalog.messages}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}
