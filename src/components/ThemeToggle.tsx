"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  applyResolvedThemeToDocument,
  getThemePreferenceFromSources,
  persistThemePreference,
  resolveTheme,
  THEME_EVENT,
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
function subscribe(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): ThemePreference {
  try {
    return getThemePreferenceFromSources(
      localStorage.getItem(THEME_STORAGE_KEY),
      null
    );
  } catch {}
  return "system";
}

function applyTheme(theme: ThemePreference) {
  const resolvedTheme = resolveTheme(
    theme,
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  applyResolvedThemeToDocument(resolvedTheme);
  persistThemePreference(theme, resolvedTheme);
  window.dispatchEvent(new Event(THEME_EVENT));
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
