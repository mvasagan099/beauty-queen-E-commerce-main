import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(root, ".next");

const MAX_ATTEMPTS = 4;

async function run() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = spawnSync("npx", ["next", "build"], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    const code = res.status === null ? 1 : res.status;
    if (code === 0) {
      process.exit(0);
    }
    if (attempt < MAX_ATTEMPTS) {
      console.error(
        `\n[build] next build failed (attempt ${attempt}/${MAX_ATTEMPTS}). ` +
          `Clearing .next and retrying to recover from flaky standalone trace...\n`
      );
      rmSync(nextDir, { recursive: true, force: true });
    } else {
      console.error(`\n[build] next build failed after ${MAX_ATTEMPTS} attempts.`);
      process.exit(code);
    }
  }
}

run();
