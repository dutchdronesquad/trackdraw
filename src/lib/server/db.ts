import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

type CloudflareContextWithD1 = {
  env: {
    DB?: D1Database;
  };
};

export async function getDatabase() {
  const { env } = (await getCloudflareContext({
    async: true,
  })) as CloudflareContextWithD1;

  if (!env.DB) {
    throw new Error(
      "Missing D1 DB binding. Update wrangler.jsonc with the D1 database binding and use Cloudflare/OpenNext preview or deploy."
    );
  }

  return env.DB;
}
