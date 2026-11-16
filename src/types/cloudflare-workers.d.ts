// The vinext Worker imports the native bindings module at runtime.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
