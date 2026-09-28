import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Output } from "./init.ts";
import { Cancelled, type Prompter } from "./prompter.ts";

const created: string[] = [];

/** Creates a temporary project from a map of file paths to contents. A trailing "/" makes a folder. */
export function project(files: Record<string, string> = {}, options: { gitRemote?: string } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "peer-ai-"));
  created.push(root);
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith("/")) {
      mkdirSync(join(root, path), { recursive: true });
      continue;
    }
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  if (options.gitRemote !== undefined) {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["remote", "add", "origin", options.gitRemote], { cwd: root });
  }
  return root;
}

export function cleanUp(): void {
  for (const root of created.splice(0)) rmSync(root, { recursive: true, force: true });
}

export function capture(): Output & { lines: string[]; text: () => string } {
  const lines: string[] = [];
  return {
    lines,
    log: (line) => lines.push(line),
    error: (line) => lines.push(line),
    text: () => lines.join("\n"),
  };
}

/** A prompter that gives scripted answers in order, or cancels when it reaches "CANCEL". */
export function scripted(answers: unknown[]): Prompter & { asked: string[] } {
  const queue = [...answers];
  const asked: string[] = [];
  const next = (message: string): unknown => {
    asked.push(message);
    if (queue.length === 0) throw new Error(`no scripted answer for: ${message}`);
    const value = queue.shift();
    if (value === "CANCEL") throw new Cancelled();
    return value;
  };
  return {
    asked,
    intro: () => undefined,
    note: () => undefined,
    outro: () => undefined,
    text: (message) => Promise.resolve(next(message) as string),
    select: <T extends string>(message: string) => Promise.resolve(next(message) as T),
    multiselect: <T extends string>(message: string) => Promise.resolve(next(message) as T[]),
    confirm: (message) => Promise.resolve(next(message) as boolean),
  };
}
