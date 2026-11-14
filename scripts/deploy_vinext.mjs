import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [target, ...args] = process.argv.slice(2);
const worker =
  target === "dev"
    ? "trackdraw-dev"
    : target === "production"
      ? "trackdraw"
      : null;
const config = "dist/server/wrangler.json";
const tag = process.env.NEXT_PUBLIC_APP_VERSION;
const dryRun = args.length === 1 && args[0] === "--dry-run";

if (!worker || (args.length && !dryRun)) {
  throw new Error(
    "Usage: npm run deploy:vinext -- <dev|production> [--dry-run]"
  );
}
if (!tag) {
  throw new Error("Set NEXT_PUBLIC_APP_VERSION to tag the Worker.");
}
if (JSON.parse(readFileSync(config, "utf8")).name !== worker) {
  throw new Error(`Expected ${config} to target ${worker}.`);
}

const uploadArgs = [
  "versions",
  "upload",
  "--config",
  config,
  "--keep-vars",
  "--name",
  worker,
  "--tag",
  tag,
];

if (dryRun) {
  execFileSync("wrangler", [...uploadArgs, "--dry-run"], { stdio: "inherit" });
} else {
  const directory = mkdtempSync(join(tmpdir(), "trackdraw-vinext-"));
  const output = join(directory, "wrangler.jsonl");

  try {
    execFileSync("wrangler", uploadArgs, {
      env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: output },
      stdio: "inherit",
    });

    const version = readFileSync(output, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .find((event) => event.type === "version-upload" && event.version === 1);
    if (version?.worker_name !== worker || !version.version_id) {
      throw new Error(`Wrangler did not report a version for ${worker}.`);
    }

    execFileSync(
      "wrangler",
      [
        "versions",
        "deploy",
        `${version.version_id}@100%`,
        "--config",
        config,
        "--name",
        worker,
        "--yes",
        "--message",
        `Deploy ${tag}`,
      ],
      { stdio: "inherit" }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
