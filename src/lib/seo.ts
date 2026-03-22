export const SITE_NAME = "TrackDraw";
export const SITE_TITLE = "TrackDraw";
export const SITE_DESCRIPTION =
  "Design FPV drone race tracks to scale, preview them in 3D, and share read-only plans with pilots in seconds.";
export const SITE_TAGLINE = "FPV Race Track Planner";
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
export const DEFAULT_SOCIAL_IMAGE =
  "/assets/screenshots/editor-element-library.png";
export const DEFAULT_SOCIAL_IMAGE_WIDTH = 1280;
export const DEFAULT_SOCIAL_IMAGE_HEIGHT = 720;
export const DEFAULT_OG_IMAGE_ALT =
  "TrackDraw interface for planning FPV race tracks";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://trackdraw.app";
}
