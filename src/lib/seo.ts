export const SITE_NAME = "TrackDraw";
export const SITE_TITLE = "TrackDraw";
export const SITE_DESCRIPTION =
  "TrackDraw is a browser-based drone race track builder for planning FPV race tracks to scale, reviewing flow in 3D, and sharing race-day layouts.";
export const SITE_TAGLINE = "Drone Race Track Builder";
export const SITE_KEYWORDS = [
  "FPV",
  "drone racing",
  "drone race track builder",
  "track design",
  "race track planner",
  "FPV track builder",
  "Dutch Drone Squad",
];
export const SITE_AUTHOR = {
  name: "Dutch Drone Squad",
  url: "https://dutchdronesquad.nl",
};
export const DEFAULT_SOCIAL_IMAGE_PATH =
  "/landing/screenshots/editor-element-library.png";
export const DEFAULT_SOCIAL_IMAGE_WIDTH = 1280;
export const DEFAULT_SOCIAL_IMAGE_HEIGHT = 720;
export const DEFAULT_OG_IMAGE_ALT =
  "TrackDraw interface for planning FPV race tracks";
export const SITE_MEDIA_BASE_URL = "https://media.trackdraw.app";
export const DEFAULT_LANDING_DEMO_POSTER =
  "https://media.trackdraw.app/landing/screenshots/editor-3d-flythroug.png";
export const LANDING_DEMO_VIDEO_PATH = "/landing/video-demo.webm";

const JSON_LD_ESCAPE_LOOKUP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://trackdraw.app";
}

export function getSiteMediaUrl(path: string) {
  const normalizedBase = SITE_MEDIA_BASE_URL.endsWith("/")
    ? SITE_MEDIA_BASE_URL.slice(0, -1)
    : SITE_MEDIA_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getLandingDemoVideoUrl() {
  return getSiteMediaUrl(LANDING_DEMO_VIDEO_PATH);
}

export function serializeJsonLd(value: unknown) {
  const json = JSON.stringify(value);
  if (typeof json !== "string") {
    throw new Error("JSON-LD value must be serializable");
  }

  return json.replace(
    /[<>&\u2028\u2029]/g,
    (character) => JSON_LD_ESCAPE_LOOKUP[character]
  );
}

export const DEFAULT_SOCIAL_IMAGE = getSiteMediaUrl(DEFAULT_SOCIAL_IMAGE_PATH);
