"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type Theme = "light" | "dark" | "system";

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};
const LABEL: Record<Theme, string> = {
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

function getSnapshot(): Theme {
  try {
    const v = localStorage.getItem("trackdraw.theme");
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
  try {
    localStorage.setItem("trackdraw.theme", theme);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const getServerSnapshot = (): Theme => "system";

const icons: Record<Theme, React.ReactNode> = {
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
