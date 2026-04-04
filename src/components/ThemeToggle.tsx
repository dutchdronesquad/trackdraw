"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  parseThemePreference,
  resolveTheme,
  RESOLVED_THEME_COOKIE,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};
const LABEL: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};
const EVENT = "trackdraw-theme";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): ThemePreference {
  try {
    const stored = parseThemePreference(
      localStorage.getItem(THEME_STORAGE_KEY)
    );
    if (stored) return stored;
  } catch {}
  return "system";
}

function applyTheme(theme: ThemePreference) {
  const resolvedTheme = resolveTheme(
    theme,
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  document.cookie = `${THEME_COOKIE}=${theme}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  document.cookie = `${RESOLVED_THEME_COOKIE}=${resolvedTheme}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new Event(EVENT));
}

const getServerSnapshot = (): ThemePreference => "system";

const icons: Record<ThemePreference, React.ReactNode> = {
  light: <Sun className="size-4" />,
  dark: <Moon className="size-4" />,
  system: <Monitor className="size-4" />,
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={() => applyTheme(NEXT[theme])}
        aria-label={`Theme: ${LABEL[theme]}`}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-md transition-colors sm:size-7"
      >
        {icons[theme]}
      </TooltipTrigger>
      <TooltipContent>
        {LABEL[theme]} — click for {LABEL[NEXT[theme]].toLowerCase()}
      </TooltipContent>
    </Tooltip>
  );
}
