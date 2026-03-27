const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function loadDotEnvFile(filename) {
  const path = resolve(process.cwd(), filename);

  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const direction = process.argv[2];
const target = process.env.TRACKDRAW_MIGRATION_TARGET;

if (!direction || !["up", "down"].includes(direction)) {
  console.error("Usage: node scripts/run-migrate.cjs <up|down>");
  process.exit(1);
}

if (!target || !["development", "production"].includes(target)) {
  console.error(
    "TRACKDRAW_MIGRATION_TARGET must be set to 'development' or 'production'."
  );
  process.exit(1);
}

const databaseUrlVar =
  target === "production"
    ? "DATABASE_URL_PRODUCTION"
    : "DATABASE_URL_DEVELOPMENT";
const databaseUrl = process.env[databaseUrlVar];

if (!databaseUrl) {
  console.error(`${databaseUrlVar} is required for ${target} migrations.`);
  process.exit(1);
}

if (
  target === "production" &&
  process.env.CONFIRM_PRODUCTION !== "trackdraw-production"
) {
  console.error(
    "Production migrations require CONFIRM_PRODUCTION=trackdraw-production."
  );
  process.exit(1);
}

execFileSync(
  process.execPath,
  [
    require.resolve("node-pg-migrate/bin/node-pg-migrate"),
    direction,
    "-m",
    "migrations",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  }
);
