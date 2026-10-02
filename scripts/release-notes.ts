// Writes a version's release notes on GitHub, so a person can see what changed before updating
// (#123). The notes gather that version's entries from all five packages' changelogs, so a change to
// a skill or a rule shows up as well as one to the command, and say how to update a project.
//
//     node scripts/release-notes.ts [--version <version>] [--target <commit>] [--dry-run]
//
// The release workflow runs it after publishing. It creates nothing when the version's release
// exists already, or when npm doesn't have the version yet.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const GITHUB = "AbuMahir980/peer-ai";
/** Each package's folder, and the name its entries are labelled with. */
const PACKAGES: [folder: string, name: string][] = [
  ["peer-ai", "peer-ai"],
  ["workflow", "peer-ai-workflow"],
  ["standards", "peer-ai-standards"],
  ["skills", "peer-ai-skills"],
  ["eslint-config", "peer-ai-eslint-config"],
];

interface Entry {
  /** The changeset's commit, which ties the same entry together across packages. */
  commit: string;
  text: string;
  packages: string[];
}

/** One version's section of a changelog: everything under its heading, up to the next one. */
export function section(changelog: string, version: string): string | undefined {
  const lines = changelog.replaceAll("\r\n", "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return undefined;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}

/** A section's entries, without the "Updated dependencies" ones. */
export function entries(sectionText: string): { commit: string; text: string }[] {
  const found: { commit: string; text: string }[] = [];
  for (const block of sectionText.split(/\n(?=- )/)) {
    const match = /^- ([0-9a-f]{7,40}): ([\s\S]*)$/.exec(block.trim());
    if (match?.[1] === undefined || match[2] === undefined) continue;
    const text = match[2]
      .split("\n")
      .map((line) => line.replace(/^ {2}/, ""))
      .join("\n")
      .replace(/\n#{3} [\s\S]*$/, "")
      .trim();
    found.push({ commit: match[1], text });
  }
  return found;
}

/** The release notes for a version, from each package's changelog. */
export function notes(changelogs: Record<string, string>, version: string): string | undefined {
  const byCommit = new Map<string, Entry>();
  for (const [name, changelog] of Object.entries(changelogs)) {
    const text = section(changelog, version);
    if (text === undefined) continue;
    for (const entry of entries(text)) {
      const known = byCommit.get(entry.commit);
      if (known === undefined) byCommit.set(entry.commit, { ...entry, packages: [name] });
      else if (!known.packages.includes(name)) known.packages.push(name);
    }
  }
  if (byCommit.size === 0) return undefined;
  const changes = [...byCommit.values()].map((entry) => {
    const [first = "", ...rest] = entry.text.split("\n");
    return [`- ${first} (${entry.packages.join(", ")})`, ...rest.map((line) => (line === "" ? "" : `  ${line}`))].join(
      "\n",
    );
  });
  return [
    "## What changed",
    "",
    ...changes,
    "",
    "## Updating a project",
    "",
    "In the project's folder, run `npx --prefer-online peer-ai@latest render`, then review and commit what it changes. In a project with `peer-ai` in its `package.json`, update it there, then run `npx peer-ai render`.",
    "",
    `Each package's full changelog is in its folder under [\`packages/\`](https://github.com/${GITHUB}/tree/main/packages).`,
    "",
  ].join("\n");
}

function run(command: string, args: string[]): { ok: boolean; out: string } {
  const result = spawnSync(command, args, { cwd: REPO, encoding: "utf8" });
  return { ok: result.status === 0, out: `${result.stdout}${result.stderr}` };
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Whether npm serves the version. A version just published takes a few minutes to show, so this
 * asks again for up to five minutes before giving up.
 */
async function onNpm(version: string, tries = 20): Promise<boolean> {
  for (let attempt = 1; attempt <= tries; attempt++) {
    if (run("npm", ["view", `peer-ai@${version}`, "version", "--prefer-online"]).ok) return true;
    if (attempt < tries) await sleep(15_000);
  }
  return false;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { version: { type: "string" }, target: { type: "string" }, "dry-run": { type: "boolean" } },
  });
  const version =
    values.version ??
    (JSON.parse(readFileSync(join(REPO, "packages/peer-ai/package.json"), "utf8")) as { version: string }).version;
  const tag = `v${version}`;
  const changelogs = Object.fromEntries(
    PACKAGES.map(([folder, name]) => [name, readFileSync(join(REPO, "packages", folder, "CHANGELOG.md"), "utf8")]),
  );
  const body = notes(changelogs, version);
  if (body === undefined) {
    console.log(`No changelog entries for ${version}, so no release notes.`);
    return;
  }
  if (values["dry-run"] === true) {
    console.log(`${tag}\n\n${body}`);
    return;
  }
  if (run("gh", ["release", "view", tag, "--repo", GITHUB]).ok) {
    console.log(`The release ${tag} exists already.`);
    return;
  }
  if (!(await onNpm(version))) {
    console.log(
      `::warning::npm still doesn't show peer-ai@${version}, so its release notes weren't written. Run this again once it does.`,
    );
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "peer-ai-notes-"));
  const file = join(dir, "notes.md");
  writeFileSync(file, body);
  const created = run("gh", [
    "release",
    "create",
    tag,
    "--repo",
    GITHUB,
    "--title",
    version,
    "--notes-file",
    file,
    ...(values.target === undefined ? [] : ["--target", values.target]),
    ...(version.includes("-") ? ["--prerelease"] : []),
  ]);
  rmSync(dir, { recursive: true, force: true });
  if (!created.ok) {
    console.error(`Creating the release ${tag} failed:\n${created.out}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Created the release ${tag}.`);
}

const invokedDirectly =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) await main();
