// Keeps client names and other private terms out of this public repository.
//
// The list comes from the PEER_AI_FORBIDDEN_TERMS secret in CI, or from an
// untracked .forbidden-terms file locally: one term per line, or comma separated,
// with # for comments. Findings name a location and the term's position in the
// list, never the term itself, so a public CI log cannot leak the list.
//
// With no list configured the check fails instead of passing: a guard that
// reports "clean" when it checked nothing is worse than no guard at all.
//
// Exit codes: 0 clean, 1 terms found, 2 not configured or misconfigured.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TERMS_FILE = ".forbidden-terms";
export const TERMS_ENV = "PEER_AI_FORBIDDEN_TERMS";

export interface Finding {
  kind: "path" | "content" | "commit";
  location: string;
  termNumber: number;
}

export interface Output {
  log: (line: string) => void;
  error: (line: string) => void;
}

export function parseTerms(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((term) => term.trim())
    .filter((term) => term !== "" && !term.startsWith("#"));
}

export function loadTerms(root: string, env: NodeJS.ProcessEnv): string[] {
  const fromEnv = env[TERMS_ENV];
  if (fromEnv !== undefined && fromEnv.trim() !== "") return parseTerms(fromEnv);
  const file = join(root, TERMS_FILE);
  return existsSync(file) ? parseTerms(readFileSync(file, "utf8")) : [];
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

function positionOf(text: string, index: number): string {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  const column = index - before.lastIndexOf("\n");
  return `${String(line)}:${String(column)}`;
}

function findAll(haystack: string, needle: string): number[] {
  const hits: number[] = [];
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) hits.push(at);
  return hits;
}

export function listTrackedFiles(root: string): string[] {
  return git(root, ["ls-files", "-z"])
    .split("\0")
    .filter((file) => file !== "");
}

export function scan(root: string, terms: string[], range?: string): Finding[] {
  const needles = terms.map((term) => term.toLowerCase());
  const findings: Finding[] = [];

  for (const file of listTrackedFiles(root)) {
    const lowerPath = file.toLowerCase();
    needles.forEach((needle, i) => {
      if (lowerPath.includes(needle)) findings.push({ kind: "path", location: file, termNumber: i + 1 });
    });

    const fullPath = join(root, file);
    // Symlinks are never followed, and files deleted from the worktree are skipped:
    // only what is actually committed is scanned.
    if (!existsSync(fullPath) || !lstatSync(fullPath).isFile()) continue;
    const bytes = readFileSync(fullPath);
    if (bytes.includes(0)) continue;
    const text = bytes.toString("utf8").toLowerCase();
    needles.forEach((needle, i) => {
      for (const at of findAll(text, needle)) {
        findings.push({ kind: "content", location: `${file}:${positionOf(text, at)}`, termNumber: i + 1 });
      }
    });
  }

  if (range !== undefined) {
    for (const record of git(root, ["log", "--format=%H%x00%B%x1e", range]).split("\x1e")) {
      const [sha = "", message = ""] = record.trim().split("\0");
      if (sha === "") continue;
      const lowerMessage = message.toLowerCase();
      needles.forEach((needle, i) => {
        if (lowerMessage.includes(needle))
          findings.push({ kind: "commit", location: sha.slice(0, 12), termNumber: i + 1 });
      });
    }
  }

  return findings;
}

interface Args {
  root: string;
  range?: string;
}

function parseArgs(argv: string[]): Args {
  let root = ".";
  let range: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if ((flag === "--root" || flag === "--range") && value !== undefined) {
      if (flag === "--root") root = value;
      else range = value;
      i++;
    } else {
      throw new Error(`unknown or incomplete argument: ${String(flag)}`);
    }
  }
  return range === undefined ? { root: resolve(root) } : { root: resolve(root), range };
}

export function main(argv: string[], env: NodeJS.ProcessEnv, out: Output): number {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    out.error(`forbidden-terms: ${(error as Error).message}. Usage: --root <dir> [--range <revisions>]`);
    return 2;
  }

  if (listTrackedFiles(args.root).includes(TERMS_FILE)) {
    out.error(`forbidden-terms: ${TERMS_FILE} is tracked by git. Remove it from the repository; it must stay private.`);
    return 2;
  }

  const terms = loadTerms(args.root, env);
  if (terms.length === 0) {
    out.error(
      `forbidden-terms: no terms configured, so nothing was checked. Set the ${TERMS_ENV} secret in CI, ` +
        `or create an untracked ${TERMS_FILE} file locally.`,
    );
    return 2;
  }

  let findings: Finding[];
  try {
    findings = scan(args.root, terms, args.range);
  } catch (error) {
    // Exit 2, not 1: an incomplete scan must never be mistaken for either "clean" or "terms found".
    const reason = (error as Error).message.split("\n")[0] ?? "unknown error";
    out.error(`forbidden-terms: the scan could not complete, so nothing was confirmed clean. ${reason}`);
    return 2;
  }
  if (findings.length === 0) {
    const scope = args.range === undefined ? "tracked files" : `tracked files and commit messages in ${args.range}`;
    out.log(`forbidden-terms: clean. ${String(terms.length)} terms checked against ${scope}.`);
    return 0;
  }

  for (const finding of findings) {
    out.error(`forbidden-terms: term #${String(finding.termNumber)} found in ${finding.kind} ${finding.location}`);
  }
  out.error(`forbidden-terms: ${String(findings.length)} finding(s). Replace them with neutral or fictional names.`);
  return 1;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2), process.env, {
    log: (line) => {
      console.log(line);
    },
    error: (line) => {
      console.error(line);
    },
  });
}
