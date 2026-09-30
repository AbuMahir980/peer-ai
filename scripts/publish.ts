// Publishes Peer AI's packages to npm. It builds them, packs each one as pnpm publish would, so
// workspace versions become real ones and publishConfig's entry points replace the source ones,
// then publishes each tarball with npm, skipping any version npm already has.
//
// The first publish of each package runs once from a maintainer's machine, after `npm login`: npm
// can't create a package through trusted publishing. Every release after that runs in
// .github/workflows/release.yml, where npm trusts this repository instead of a token.
//
//     node scripts/publish.ts [--dry-run]
//
// The tag: `latest` for a stable version, and for a pre-release while a package has no stable
// version yet, so `npx peer-ai` gets the newest; `next` for a pre-release after that.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPO = fileURLToPath(new URL("..", import.meta.url));
/** The package folders, each after the packages it depends on. */
const FOLDERS = ["workflow", "standards", "skills", "eslint-config", "peer-ai"];

const { values } = parseArgs({ options: { "dry-run": { type: "boolean" } } });
const dryRun = values["dry-run"] === true;

// pnpm as the command that started this script, when it did; otherwise the one on the PATH.
const pnpmPath = process.env.npm_execpath?.includes("pnpm") === true ? process.env.npm_execpath : "pnpm";
const pnpm = (args: string[], cwd: string) => execFileSync(pnpmPath, args, { cwd, encoding: "utf8" });

/** The versions npm has of a package, or none when npm doesn't know it yet. */
function published(name: string): string[] {
  const result = spawnSync("npm", ["view", name, "versions", "--json"], { encoding: "utf8" });
  if (result.status !== 0) {
    if (result.stderr.includes("E404")) return [];
    throw new Error(`npm view ${name} failed:\n${result.stderr}`);
  }
  const versions = JSON.parse(result.stdout) as string | string[];
  return Array.isArray(versions) ? versions : [versions];
}

const prerelease = (version: string) => version.includes("-");

pnpm(["-r", "run", "build"], REPO);
const packs = mkdtempSync(join(tmpdir(), "peer-ai-publish-"));
let failed = false;

for (const folder of FOLDERS) {
  const dir = join(REPO, "packages", folder);
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    name: string;
    version: string;
    private?: boolean;
  };
  if (pkg.private === true) throw new Error(`${pkg.name} is marked private, so it can't be published.`);
  const versions = published(pkg.name);
  if (versions.includes(pkg.version)) {
    console.log(`${pkg.name}@${pkg.version} is already on npm.`);
    continue;
  }
  // npm can't create a package through trusted publishing, so a new package's first version comes
  // from a maintainer's machine. See CONTRIBUTING.md.
  if (versions.length === 0 && process.env.GITHUB_ACTIONS === "true") {
    console.log(
      `::warning::${pkg.name} isn't on npm yet. A maintainer publishes its first version: see CONTRIBUTING.md.`,
    );
    continue;
  }
  const tag = !prerelease(pkg.version) || !versions.some((version) => !prerelease(version)) ? "latest" : "next";
  const before = new Set(readdirSync(packs));
  pnpm(["pack", "--pack-destination", packs], dir);
  const tarball = readdirSync(packs).find((file) => !before.has(file));
  if (tarball === undefined) throw new Error(`pnpm pack wrote no tarball for ${pkg.name}.`);
  console.log(`Publishing ${pkg.name}@${pkg.version} as ${tag}${dryRun ? " (dry run)" : ""}.`);
  // npm asks for the second factor itself when a person publishes, so it gets the terminal.
  const publish = spawnSync(
    "npm",
    ["publish", join(packs, tarball), "--tag", tag, "--access", "public", ...(dryRun ? ["--dry-run"] : [])],
    { stdio: "inherit" },
  );
  if (publish.status !== 0) {
    console.error(`Publishing ${pkg.name} failed.`);
    failed = true;
    break;
  }
}

rmSync(packs, { recursive: true, force: true });
if (failed) process.exitCode = 1;
