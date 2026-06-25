"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  defaultLocale,
  getLocaleFromBrowser,
  isValidLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_STORAGE_KEY,
  type SupportedLocale,
} from "@/lib/i18n/locales";

type LocaleState = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

function writeCookie(locale: SupportedLocale) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; Max-Age=${LOCALE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  } catch {
    // storage unavailable
  }
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: getLocaleFromBrowser(),
      setLocale: (locale) => {
        writeCookie(locale);
        set({ locale });
      },
    }),
    {
      name: LOCALE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) writeCookie(state.locale);
      },
    }
  )
);

export function useLocale(): SupportedLocale {
  return useLocaleStore((s) => s.locale);
}

// Sync locale changes made in other browser tabs.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LOCALE_STORAGE_KEY) {
      void useLocaleStore.persist.rehydrate();
    }
  });
}

// Validate stored value on rehydration; fall back to default if corrupted.
useLocaleStore.persist.onFinishHydration((state) => {
  if (!isValidLocale(state.locale)) {
    useLocaleStore.setState({ locale: defaultLocale });
    writeCookie(defaultLocale);
  }
});
