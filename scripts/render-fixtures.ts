// Renders every practice project again, as a release needs: render writes Peer AI's exact version
// into each AI tool's settings, so a new version changes them. The skills render also writes stay
// out of git, and are removed again here.
//
//     node scripts/render-fixtures.ts

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = fileURLToPath(new URL("../fixtures", import.meta.url));
const CLI = fileURLToPath(new URL("../packages/peer-ai/src/cli.ts", import.meta.url));

for (const name of readdirSync(FIXTURES, { withFileTypes: true })) {
  if (!name.isDirectory()) continue;
  const dir = join(FIXTURES, name.name);
  if (!existsSync(join(dir, "peer-ai.config.json"))) continue;
  execFileSync(process.execPath, [CLI, "render", "--quiet"], { cwd: dir, stdio: "inherit" });
  for (const home of [".claude/skills", ".agents/skills"]) {
    const skills = join(dir, home);
    if (!existsSync(skills)) continue;
    for (const skill of readdirSync(skills).filter((folder) => folder.startsWith("peer-ai-"))) {
      rmSync(join(skills, skill), { recursive: true, force: true });
    }
  }
  console.log(`Rendered ${name.name}.`);
}
