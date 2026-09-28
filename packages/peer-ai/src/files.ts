// Lists a repository's files as forward-slash paths relative to its root. In a git repository
// it asks git, so .gitignore is respected; otherwise it walks the folder. Dependency and build
// folders are always skipped, and symlinks are never followed.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".turbo",
  ".expo",
  "coverage",
  "vendor",
  "Pods",
  ".venv",
  "venv",
  "__pycache__",
  ".dart_tool",
  ".gradle",
  "target",
]);
const MAX_FILES = 50_000;

const skipped = (path: string): boolean => path.split("/").some((part) => SKIP_DIRS.has(part));

export function listRepoFiles(root: string): string[] {
  if (existsSync(join(root, ".git"))) {
    try {
      const listed = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 256 * 1024 * 1024,
      });
      return listed
        .split("\0")
        .filter((file) => file !== "" && !skipped(file))
        .slice(0, MAX_FILES);
    } catch {
      // Not usable as a git repository after all: fall back to walking the folder.
    }
  }

  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      if (files.length >= MAX_FILES) return;
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      const stats = lstatSync(full);
      if (stats.isDirectory()) walk(full);
      else if (stats.isFile()) files.push(relative(root, full).split(sep).join("/"));
    }
  };
  walk(root);
  return files;
}
