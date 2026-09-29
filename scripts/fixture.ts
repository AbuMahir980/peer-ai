// Prepares a copy of a fixture project for an AI tool to work on. The copy is a fresh git
// repository outside this one, so the tool doesn't also read this repository's instructions, and
// its MCP registrations start this checkout's peer-ai, since the package isn't published yet.
//
//   node scripts/fixture.ts split-bill [--into <empty or new folder>]

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function prepareFixture(name: string, into?: string): string {
  const source = join(REPO, "fixtures", name);
  if (!existsSync(source)) {
    throw new Error(`There is no fixture "${name}". The fixtures are: ${fixtures().join(", ")}.`);
  }
  if (into !== undefined && existsSync(into) && readdirSync(into).length > 0) {
    throw new Error(`${into} isn't empty. Give a new or empty folder.`);
  }
  const target = into === undefined ? mkdtempSync(join(tmpdir(), `peer-ai-${name}-`)) : resolve(into);
  cpSync(source, target, { recursive: true });

  for (const [path, key] of REGISTRATIONS) {
    const file = join(target, path);
    if (!existsSync(file)) continue;
    const config = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, object> | undefined>;
    const servers = config[key];
    if (servers?.["peer-ai"] === undefined) continue;
    servers["peer-ai"] = { ...servers["peer-ai"], ...localServer() };
    writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  }

  // Claude Code's hook writes the skills with a published peer-ai; point it at this checkout too.
  const settingsFile = join(target, ".claude/settings.json");
  if (existsSync(settingsFile)) {
    const local = `${process.execPath} ${CLI} render --skills`;
    const text = readFileSync(settingsFile, "utf8");
    const settings = JSON.parse(text) as unknown;
    const pointed = JSON.stringify(
      settings,
      (_key, value: unknown) =>
        typeof value === "string" ? value.replace(/npx (?:-y )?peer-ai(?:@\S+)? render --skills/, local) : value,
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
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { into: { type: "string" } } });
  const [name] = positionals;
  if (name === undefined) {
    console.error(
      `Usage: node scripts/fixture.ts <fixture> [--into <folder>]. The fixtures are: ${fixtures().join(", ")}.`,
    );
    process.exit(2);
  }
  const target = prepareFixture(name, values.into);
  const { command, args } = localServer();
  console.log(`Prepared ${name} in ${target}\n`);
  console.log(`Claude Code:  cd ${target} && claude`);
  console.log(`Codex:        codex mcp add peer-ai -- ${command} ${args.join(" ")}`);
  console.log(`              then cd ${target} && codex`);
  console.log(`Cursor:       open ${target} in Cursor; .cursor/mcp.json already starts this checkout's server.`);
}
