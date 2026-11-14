import "server-only";

export async function getWorkerBindings() {
  // Next.js previews leave this import to the runtime. Vite bundles it as a native Worker module.
  const { env } = await import(
    /* webpackIgnore: true, turbopackIgnore: true */ "cloudflare:workers"
  );
  return env;
}
