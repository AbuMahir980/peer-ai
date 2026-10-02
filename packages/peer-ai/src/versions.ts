// Which Peer AI a project uses, and whether the one running is it (RFC 0011). During an update, CI
// moves to the new version as soon as the change merges, while an AI tool's MCP server keeps the
// version it started with until it reconnects. doctor says so, and next_work passes it on.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok, skip, warn, type Check } from "./checks.ts";
import { GATE_FILE } from "./gate.ts";
import { VERSION } from "./package-info.ts";

const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/;
const PINNED = /peer-ai@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/;

/** The files render pins the version in, the MCP registrations first. */
const RENDERED = [".mcp.json", ".cursor/mcp.json", ".vscode/mcp.json", ".gemini/settings.json", GATE_FILE];

function readText(root: string, path: string): string | undefined {
  try {
    return readFileSync(join(root, path), "utf8");
  } catch {
    return undefined;
  }
}

function readJson(root: string, path: string): unknown {
  const text = readText(root, path);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The Peer AI version the project's tools were last set up with, from the files render wrote. */
export function renderedVersion(root: string): string | undefined {
  for (const path of RENDERED) {
    const version = PINNED.exec(readText(root, path) ?? "")?.[1];
    if (version !== undefined) return version;
  }
  return undefined;
}

interface Manifest {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface Pinned {
  version: string;
  /** Where it's pinned, such as package.json or .mcp.json. */
  from: string;
}

/**
 * The Peer AI version the project uses: the exact version its package.json names, else the one
 * installed for a range, else the one render pinned in the files it wrote.
 */
export function pinnedVersion(root: string): Pinned | undefined {
  const manifest = readJson(root, "package.json") as Manifest | undefined;
  const spec = manifest?.devDependencies?.["peer-ai"] ?? manifest?.dependencies?.["peer-ai"];
  if (spec !== undefined) {
    if (EXACT.test(spec)) return { version: spec, from: "package.json" };
    const installed = (readJson(root, "node_modules/peer-ai/package.json") as Manifest | undefined)?.version;
    return installed === undefined ? undefined : { version: installed, from: "node_modules" };
  }
  for (const path of RENDERED) {
    const version = PINNED.exec(readText(root, path) ?? "")?.[1];
    if (version !== undefined) return { version, from: path };
  }
  return undefined;
}

/** Orders two versions, a pre-release before its release, as semantic versioning does. */
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    const [release = "", pre] = version.split("-", 2);
    return { release: release.split(".").map(Number), pre: pre === undefined ? [] : pre.split(".") };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i++) {
    const difference = (left.release[i] ?? 0) - (right.release[i] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  if (left.pre.length === 0 || right.pre.length === 0) return Math.sign(right.pre.length - left.pre.length);
  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const [x, y] = [left.pre[i], right.pre[i]];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const numeric = /^\d+$/.test(x) && /^\d+$/.test(y);
    return numeric ? Math.sign(Number(x) - Number(y)) : x < y ? -1 : 1;
  }
  return 0;
}

/** The Peer AI running is the one the project uses. */
export function checkVersion(root: string, running: string = VERSION): Check {
  const pinned = pinnedVersion(root);
  if (pinned === undefined) return skip("version", `Peer AI ${running}; the project pins no version yet`);
  if (pinned.version === running) return ok("version", `Peer AI ${running}, the version the project uses`);
  const installed = pinned.from === "package.json";
  if (compareVersions(pinned.version, running) > 0) {
    return warn(
      "version",
      `This is Peer AI ${running}, and the project now uses ${pinned.version} (${pinned.from}).`,
      installed
        ? `Install the project's dependencies, then reconnect your AI tool to Peer AI, or restart it, so its tools and CI agree.`
        : `Reconnect your AI tool to Peer AI, or restart it, so its tools and CI agree. From a terminal, run npx peer-ai@${pinned.version}.`,
    );
  }
  return warn(
    "version",
    `This is Peer AI ${running}, but the project uses ${pinned.version} (${pinned.from}).`,
    installed
      ? `To move the project to ${running}, set peer-ai to ${running} in package.json, install, run npx peer-ai render and commit what it changes.`
      : `To move the project to ${running}, run npx --prefer-online peer-ai@${running} render and commit what it changes. To stay on ${pinned.version}, run npx peer-ai@${pinned.version}.`,
  );
}
