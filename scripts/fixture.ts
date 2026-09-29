// Prepares a copy of a fixture project for an AI tool to work on. The copy is a fresh git
// repository outside this one, so the tool doesn't also read this repository's instructions, and
// its MCP registrations start this checkout's peer-ai, since the package isn't published yet. With
// --skills, this checkout's render writes Peer AI's skills into it, as a person's render would.
//
//   node scripts/fixture.ts split-bill [--into <empty or new folder>] [--skills]

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(REPO, "packages/peer-ai/src/cli.ts");

/** Where each tool registers MCP servers in a project, and the key they sit under. */
const REGISTRATIONS: [path: string, key: string][] = [
  [".mcp.json", "mcpServers"],
  [".cursor/mcp.json", "mcpServers"],
  [".vscode/mcp.json", "servers"],
  [".gemini/settings.json", "mcpServers"],
];

export function localServer(): { command: string; args: string[] } {
  return { command: process.execPath, args: [CLI, "mcp"] };
}

export function fixtures(): string[] {
  return readdirSync(join(REPO, "fixtures"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export interface PrepareOptions {
  /** Write Peer AI's skills into the copy, as peer-ai render does. */
  skills?: boolean;
}

export function prepareFixture(name: string, into?: string, options: PrepareOptions = {}): string {
  const source = join(REPO, "fixtures", name);
  if (!existsSync(source)) {
    throw new Error(`There is no fixture "${name}". The fixtures are: ${fixtures().join(", ")}.`);
  }
  if (into !== undefined && existsSync(into) && readdirSync(into).length > 0) {
    throw new Error(`${into} isn't empty. Give a new or empty folder.`);
  }
  const target = into === undefined ? mkdtempSync(join(tmpdir(), `peer-ai-${name}-`)) : resolve(into);
  cpSync(source, target, { recursive: true });

  // Skills rendered into the fixture on this machine are left out of git, so a copy starts without
  // them, like a fresh clone. Only --skills writes them, fresh from this checkout.
  for (const home of [".claude/skills", ".agents/skills"]) {
    const folder = join(target, home);
    if (!existsSync(folder)) continue;
    for (const entry of readdirSync(folder).filter((entry) => entry.startsWith("peer-ai-"))) {
      rmSync(join(folder, entry), { recursive: true, force: true });
    }
  }
  if (options.skills === true) execFileSync(process.execPath, [CLI, "render"], { cwd: target, stdio: "ignore" });

  for (const [path, key] of REGISTRATIONS) {
    const file = join(target, path);
    if (!existsSync(file)) continue;
    const config = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, object> | undefined>;
    const servers = config[key];
    if (servers?.["peer-ai"] === undefined) continue;
    servers["peer-ai"] = { ...servers["peer-ai"], ...localServer() };
    writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  }

  // Claude Code's hook writes the skills with a published peer-ai. With --skills, point it at this
  // checkout; without, take it out, so a run meant to be without skills stays that way.
  const settingsFile = join(target, ".claude/settings.json");
  if (existsSync(settingsFile)) {
    const hook = /npx (?:-y )?peer-ai(?:@\S+)? render --skills/;
    const settings = JSON.parse(readFileSync(settingsFile, "utf8")) as { hooks?: { SessionStart?: unknown[] } };
    const starts = settings.hooks?.SessionStart;
    if (options.skills !== true && settings.hooks !== undefined && Array.isArray(starts)) {
      settings.hooks.SessionStart = starts.filter((group) => !hook.test(JSON.stringify(group)));
    }
    const local = `${process.execPath} ${CLI} render --skills`;
    const pointed = JSON.stringify(
      settings,
      (_key, value: unknown) => (typeof value === "string" ? value.replace(hook, local) : value),
      2,
    );
    writeFileSync(settingsFile, `${pointed}\n`);
  }

  const git = (...args: string[]) => execFileSync("git", args, { cwd: target, stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  const identity = [
    "-c",
    "user.name=Peer AI fixture",
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "commit.gpgsign=false",
  ];
  git(...identity, "commit", "-q", "-m", "The fixture as it starts");
  return target;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { into: { type: "string" }, skills: { type: "boolean" } },
  });
  const [name] = positionals;
  if (name === undefined) {
    console.error(
      `Usage: node scripts/fixture.ts <fixture> [--into <folder>] [--skills]. The fixtures are: ${fixtures().join(", ")}.`,
    );
    process.exit(2);
  }
  const target = prepareFixture(name, values.into, { skills: values.skills === true });
  const { command, args } = localServer();
  console.log(`Prepared ${name} in ${target}\n`);
  console.log(`Claude Code:  cd ${target} && claude`);
  console.log(`Codex:        codex mcp add peer-ai -- ${command} ${args.join(" ")}`);
  console.log(`              then cd ${target} && codex`);
  console.log(`Cursor:       open ${target} in Cursor; .cursor/mcp.json already starts this checkout's server.`);
}
