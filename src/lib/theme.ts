export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "trackdraw.theme";
export const THEME_COOKIE = "trackdraw-theme";
export const RESOLVED_THEME_COOKIE = "trackdraw-theme-resolved";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)"),c=document.cookie.split("; ").find(v=>v.startsWith("${THEME_COOKIE}="))?.split("=")[1];let s=null;try{s=localStorage.getItem("${THEME_STORAGE_KEY}")}catch{}const p=["light","dark","system"].includes(s??"")?s:["light","dark","system"].includes(c??"")?c:"system",r=p==="system"?(m.matches?"dark":"light"):p;d.classList.toggle("dark",r==="dark");d.style.colorScheme=r;try{localStorage.setItem("${THEME_STORAGE_KEY}",p)}catch{}document.cookie="${THEME_COOKIE}="+p+"; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax";document.cookie="${RESOLVED_THEME_COOKIE}="+r+"; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax"}catch{}})()`;

export function parseThemePreference(
  value: string | null | undefined
): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

export function parseResolvedTheme(
  value: string | null | undefined
): ResolvedTheme | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }
  return preference;
}
