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

function normalizeLocale(locale: unknown): SupportedLocale {
  return isValidLocale(locale) ? locale : defaultLocale;
}

const localeStorageBackend = {
  getItem: (name: string): string | null => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !("state" in parsed)) {
        return null;
      }

      const envelope = parsed as {
        state?: { locale?: unknown };
        version?: unknown;
      };
      return JSON.stringify({
        ...envelope,
        state: {
          ...envelope.state,
          locale: normalizeLocale(envelope.state?.locale),
        },
      });
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* storage unavailable */
    }
  },
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: getLocaleFromBrowser(),
      setLocale: (locale) => {
        const nextLocale = normalizeLocale(locale);
        writeCookie(nextLocale);
        set({ locale: nextLocale });
      },
    }),
    {
      name: LOCALE_STORAGE_KEY,
      storage: createJSONStorage(() => localeStorageBackend),
      onRehydrateStorage: () => (state) => {
        if (state) writeCookie(normalizeLocale(state.locale));
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
