// Integration tests exercise the real Rust repository; this helper is never shipped.
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(
  __dirname,
  "../../experiments/tauri-desktop/src-tauri"
);
execFileSync(
  "cargo",
  [
    "build",
    "--locked",
    "--no-default-features",
    "--bin",
    "repository-cli",
    "--manifest-path",
    path.join(root, "Cargo.toml"),
  ],
  { stdio: "pipe" }
);
const binary = path.join(
  process.env.CARGO_TARGET_DIR || path.join(root, "target"),
  "debug",
  process.platform === "win32" ? "repository-cli.exe" : "repository-cli"
);
function openRepository(filename) {
  const command = (name, payload) =>
    JSON.parse(
      execFileSync(binary, [filename], {
        input: JSON.stringify({ name, payload }),
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      })
    );
  command("state");
  return { command, close() {} };
}
module.exports = { openRepository };
