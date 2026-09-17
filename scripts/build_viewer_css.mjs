import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve relative to this file, not process.cwd() - this script also runs
// from packages/viewer's own `build` script, whose cwd is packages/viewer/.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

const input = path.join(ROOT, "packages/viewer/src/static-entry.css");
const output = path.join(
  ROOT,
  "packages/viewer/dist/static/trackdraw-viewer.css"
);

execFileSync(
  "npx",
  [
    "@tailwindcss/cli",
    "-i",
    input,
    "-o",
    output,
    "--content",
    path.join(ROOT, "packages/viewer/src/**/*.tsx"),
    "--content",
    path.join(ROOT, "src/components/**/*.tsx"),
    "--content",
    path.join(ROOT, "src/hooks/**/*.ts"),
    "--minify",
  ],
  { cwd: ROOT, stdio: "inherit" }
);
