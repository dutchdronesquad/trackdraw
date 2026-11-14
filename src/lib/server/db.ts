import "server-only";

import { getWorkerBindings } from "@/lib/server/cloudflare-bindings";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T>(statements: D1PreparedStatement[]): Promise<{ results: T[] }[]>;
};

type D1Bindings = {
  DB?: D1Database;
};

export async function getDatabase() {
  const env = (await getWorkerBindings()) as D1Bindings;

  if (!env.DB) {
    throw new Error(
      "Missing D1 DB binding. Update wrangler.jsonc with the D1 database binding and use Cloudflare preview or deploy."
    );
  }

  return env.DB;
}
