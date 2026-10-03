// Proves the packages work as people will get them from npm: builds each one, packs it as
// `pnpm publish` would, installs the packed files into an empty project with npm, checks they hold
// nothing only the tests use, and runs the installed peer-ai there: its version, init, assess and
// render, and the MCP server AI tools connect to, and loads the ESLint settings as a project's
// eslint.config.js would. It runs in CI on Linux, macOS and Windows, and locally:
//
//     node scripts/package-proof.ts

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = ["workflow", "standards", "skills", "peer-ai", "eslint-config"];
const work = mkdtempSync(join(tmpdir(), "peer-ai-package-proof-"));
const failures: string[] = [];
// On Windows, pnpm, npm and an installed command are .cmd files, which run only through a shell.
const WINDOWS = process.platform === "win32";

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: WINDOWS });
}

function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failures.push(`${name}${detail === "" ? "" : `\n${detail}`}`);
}

/** Starts the installed MCP server, asks it to start a session and list its tools, and returns their names. */
function mcpTools(cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Through the installed command's link, as an AI tool starts it; on Windows, through Node itself,
    // since a server started through a shell can't be stopped with it.
    const server = WINDOWS
      ? spawn(process.execPath, [join(cwd, "node_modules", "peer-ai", "dist", "cli.js"), "mcp"], { cwd })
      : spawn(join(cwd, "node_modules", ".bin", "peer-ai"), ["mcp"], { cwd });
    let buffer = "";
    const timer = setTimeout(() => {
      server.kill();
      reject(new Error(`The MCP server didn't answer in 30 s. It printed: ${buffer}`));
    }, 30_000);
    server.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      for (const line of buffer.split("\n")) {
        if (!line.includes('"id":2')) continue;
        clearTimeout(timer);
        server.kill();
        const reply = JSON.parse(line) as { result?: { tools?: { name: string }[] } };
        resolve((reply.result?.tools ?? []).map((tool) => tool.name));
        return;
      }
    });
    const send = (message: object) => server.stdin.write(`${JSON.stringify(message)}\n`);
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "package-proof", version: "1" } },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  });
}

// 1. Build and pack, as pnpm publish does: workspace versions become real ones, and publishConfig's
// entry points replace the source ones.
run("pnpm", ["-r", "run", "build"], REPO);
const packs = join(work, "packs");
mkdirSync(packs);
for (const name of PACKAGES) run("pnpm", ["pack", "--pack-destination", packs], join(REPO, "packages", name));
const tarballs = readdirSync(packs).map((file) => join(packs, file));
check("every package packs", tarballs.length === PACKAGES.length, tarballs.join("\n"));

// 2. Install them into an empty project, as someone would from npm.
const project = join(work, "project");
mkdirSync(project);
writeFileSync(join(project, "package.json"), `${JSON.stringify({ name: "repairs", private: true }, null, 2)}\n`);
writeFileSync(join(project, "README.md"), "# Repairs\n\nA made-up bicycle repair service.\n");
run("git", ["init", "--quiet"], project);
run("npm", ["install", "--no-audit", "--no-fund", "--save-dev", ...tarballs], project);
const bin = join(project, "node_modules", ".bin", WINDOWS ? "peer-ai.cmd" : "peer-ai");
check("peer-ai is installed as a command", existsSync(bin));

// Nothing only the tests use ships: test files, or the helpers only they import.
const testOnly = PACKAGES.flatMap((folder) => {
  const { name } = JSON.parse(readFileSync(join(REPO, "packages", folder, "package.json"), "utf8")) as { name: string };
  const installed = join(project, "node_modules", name);
  return readdirSync(installed, { recursive: true, encoding: "utf8" })
    .filter((file) => !file.split(/[\\/]/).includes("node_modules"))
    .filter((file) => /(\.test|(^|[\\/])test-helpers)\.(d\.)?[jt]s$/.test(file))
    .map((file) => join(installed, file));
});
check("no package ships test-only files", testOnly.length === 0, testOnly.join("\n"));

// 3. Run it there.
const version = JSON.parse(readFileSync(join(REPO, "packages", "peer-ai", "package.json"), "utf8")) as {
  version: string;
};
check("peer-ai --version", run(bin, ["--version"], project).trim().endsWith(version.version));
run(bin, ["init", "--yes", "--name", "Repairs", "--stage", "mvp", "--tool", "claude-code"], project);
check("peer-ai init writes the config", existsSync(join(project, "peer-ai.config.json")));
run(bin, ["assess"], project);
check("peer-ai assess writes the project map", existsSync(join(project, ".peer-ai", "map.json")));
run(bin, ["render"], project);
const skills = join(project, ".claude", "skills");
check(
  "peer-ai render writes the skills",
  existsSync(skills) && readdirSync(skills).some((skill) => skill === "peer-ai-security-review"),
);
const tools = await mcpTools(project);
check(
  "the MCP server lists its tools",
  tools.includes("next_work") && tools.includes("record_review"),
  tools.join(", "),
);

// The ESLint settings load as a project's eslint.config.js loads them, with ESLint and
// typescript-eslint installed beside them as their peers.
writeFileSync(
  join(project, "eslint-check.mjs"),
  'const { default: peerAi } = await import("peer-ai-eslint-config");\nconsole.log(typeof peerAi);\n',
);
check(
  "peer-ai-eslint-config loads",
  execFileSync(process.execPath, ["eslint-check.mjs"], { cwd: project, encoding: "utf8" }).trim() === "function",
);

if (failures.length > 0) {
  console.error(`\n${failures.join("\n\n")}`);
  process.exitCode = 1;
} else {
  rmSync(work, { recursive: true, force: true });
}
