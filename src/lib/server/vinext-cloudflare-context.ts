// Loaded only by the vinext Worker build.
import { env } from "cloudflare:workers";

export function getCloudflareContext(_options: { async: true }) {
  return { env };
}
