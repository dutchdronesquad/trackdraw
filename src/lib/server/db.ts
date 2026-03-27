import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

type HyperdriveBinding = {
  connectionString: string;
};

type RuntimeEnvironment = "development" | "production";

type CloudflareContextWithHyperdrive = {
  env: {
    HYPERDRIVE?: HyperdriveBinding;
    TRACKDRAW_RUNTIME_ENV?: RuntimeEnvironment;
    TRACKDRAW_DB_ENV?: RuntimeEnvironment;
  };
};

async function getHyperdriveBinding() {
  const { env } = (await getCloudflareContext({
    async: true,
  })) as CloudflareContextWithHyperdrive;

  if (!env.HYPERDRIVE?.connectionString) {
    throw new Error(
      "Missing HYPERDRIVE binding. Update wrangler.jsonc with the Hyperdrive ID and regenerate Cloudflare env types."
    );
  }

  return env.HYPERDRIVE;
}

export async function createDatabaseClient() {
  const hyperdrive = await getHyperdriveBinding();
  const { env } = (await getCloudflareContext({
    async: true,
  })) as CloudflareContextWithHyperdrive;
  const runtimeEnv =
    (process.env.TRACKDRAW_RUNTIME_ENV as RuntimeEnvironment | undefined) ??
    env.TRACKDRAW_RUNTIME_ENV ??
    "development";
  const databaseEnv =
    (process.env.TRACKDRAW_DB_ENV as RuntimeEnvironment | undefined) ??
    env.TRACKDRAW_DB_ENV ??
    "development";

  if (runtimeEnv !== databaseEnv) {
    throw new Error(
      `Refusing database connection because TRACKDRAW_RUNTIME_ENV=${runtimeEnv} and TRACKDRAW_DB_ENV=${databaseEnv} do not match.`
    );
  }

  return postgres(hyperdrive.connectionString, {
    max: 1,
  });
}

export async function runDatabaseHealthCheck() {
  const sql = await createDatabaseClient();

  try {
    const result = await sql<
      {
        now: string;
        current_database: string;
        current_user: string;
      }[]
    >`
      select
        now()::text as now,
        current_database() as current_database,
        current_user as current_user
    `;

    return result[0];
  } finally {
    await sql.end();
  }
}
