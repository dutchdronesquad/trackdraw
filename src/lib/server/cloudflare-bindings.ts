import "server-only";

export async function getWorkerBindings() {
  const { env } = await import("cloudflare:workers");
  return env;
}
