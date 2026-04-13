export const SITE_NAME = "TrackDraw";
export const SITE_TITLE = "TrackDraw";
export const SITE_DESCRIPTION =
  "Plan drone race tracks to scale, review FPV track flow in 3D, and share read-only race-day layouts with pilots and crew.";
export const SITE_TAGLINE = "Drone Race Track Planner";
export const SITE_KEYWORDS = [
  "FPV",
  "drone racing",
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

export const DEFAULT_SOCIAL_IMAGE = getSiteMediaUrl(DEFAULT_SOCIAL_IMAGE_PATH);
