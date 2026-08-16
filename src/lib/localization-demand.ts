import { isValidLocale, type SupportedLocale } from "@/lib/i18n/locales";
import { getProductAnalyticsDisabled } from "@/lib/product-events";

export const localizationDemandLanguageCodes = [
  "aa",
  "ab",
  "ae",
  "af",
  "ak",
  "am",
  "an",
  "ar",
  "as",
  "av",
  "ay",
  "az",
  "ba",
  "be",
  "bg",
  "bh",
  "bi",
  "bm",
  "bn",
  "bo",
  "br",
  "bs",
  "ca",
  "ce",
  "ch",
  "co",
  "cr",
  "cs",
  "cu",
  "cv",
  "cy",
  "da",
  "de",
  "dv",
  "dz",
  "ee",
  "el",
  "en",
  "eo",
  "es",
  "et",
  "eu",
  "fa",
  "ff",
  "fi",
  "fj",
  "fo",
  "fr",
  "fy",
  "ga",
  "gd",
  "gl",
  "gn",
  "gu",
  "gv",
  "ha",
  "he",
  "hi",
  "ho",
  "hr",
  "ht",
  "hu",
  "hy",
  "hz",
  "ia",
  "id",
  "ie",
  "ig",
  "ii",
  "ik",
  "io",
  "is",
  "it",
  "iu",
  "ja",
  "jv",
  "ka",
  "kg",
  "ki",
  "kj",
  "kk",
  "kl",
  "km",
  "kn",
  "ko",
  "kr",
  "ks",
  "ku",
  "kv",
  "kw",
  "ky",
  "la",
  "lb",
  "lg",
  "li",
  "ln",
  "lo",
  "lt",
  "lu",
  "lv",
  "mg",
  "mh",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "my",
  "na",
  "nb",
  "nd",
  "ne",
  "ng",
  "nl",
  "nn",
  "no",
  "nr",
  "nv",
  "ny",
  "oc",
  "oj",
  "om",
  "or",
  "os",
  "pa",
  "pi",
  "pl",
  "ps",
  "pt",
  "qu",
  "rm",
  "rn",
  "ro",
  "ru",
  "rw",
  "sa",
  "sc",
  "sd",
  "se",
  "sg",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sq",
  "sr",
  "ss",
  "st",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "th",
  "ti",
  "tk",
  "tl",
  "tn",
  "to",
  "tr",
  "ts",
  "tt",
  "tw",
  "ty",
  "ug",
  "uk",
  "ur",
  "uz",
  "ve",
  "vi",
  "vo",
  "wa",
  "wo",
  "xh",
  "yi",
  "yo",
  "za",
  "zh",
  "zu",
] as const;

export type LocalizationDemandLanguage =
  (typeof localizationDemandLanguageCodes)[number];

const languageCodeSet = new Set<string>(localizationDemandLanguageCodes);
const deprecatedLanguageAliases: Record<string, string> = {
  in: "id",
  iw: "he",
  ji: "yi",
};
const LOCALIZATION_DEMAND_RECORDED_KEY =
  "trackdraw.localizationDemand.recorded";

export function normalizePreferredLanguage(
  acceptLanguage: string | null | undefined
): LocalizationDemandLanguage | "unknown" {
  if (!acceptLanguage) return "unknown";

  const candidates = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.slice(2))
        : 1;
      return {
        tag,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      };
    })
    .filter((candidate) => candidate.quality > 0)
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index
    );

  for (const candidate of candidates) {
    const primary = candidate.tag
      .trim()
      .replaceAll("_", "-")
      .split("-")[0]
      ?.toLowerCase();
    if (!primary) continue;
    const canonical = deprecatedLanguageAliases[primary] ?? primary;
    if (languageCodeSet.has(canonical)) {
      return canonical as LocalizationDemandLanguage;
    }
  }

  return "unknown";
}

export function trackLocalizationDemand(locale: SupportedLocale) {
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV === "test" ||
    getProductAnalyticsDisabled() ||
    !isValidLocale(locale)
  ) {
    return;
  }

  try {
    if (window.sessionStorage.getItem(LOCALIZATION_DEMAND_RECORDED_KEY)) {
      return;
    }
    window.sessionStorage.setItem(LOCALIZATION_DEMAND_RECORDED_KEY, "1");
  } catch {
    // Localization analytics remain best effort when storage is unavailable.
  }

  void fetch("/api/localization-demand", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ servedLocale: locale }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt the editor.
  });
}
