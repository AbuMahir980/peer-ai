// Migrations that will collide (RFC 0018). Each open work item has a branch. When the current item's
// branch and another's each add a migration in the same folder, whichever merges second needs its
// migration re-parented, then reviewed again. For Alembic, two new migrations on the same parent
// revision make two heads for certain. Everything is read from git, locally or as the remote has it
// already, with no network, and only when the current branch adds a migration.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkItem } from "peer-ai-workflow";
import { currentBranch, forkPoint } from "./commits.ts";

const OWN_FILES = ":(exclude).peer-ai";
/** The folders migrations live in: Django, Flask-Migrate and SQL migrations, Rails, Prisma and Drizzle. */
const FOLDERS = new Set(["migration", "migrations", "migrate", "drizzle"]);
/** Files in a migrations folder that aren't a migration. */
const NOT_MIGRATION = /(^|\/)(__init__\.py|\.gitkeep|\.keep|README[^/]*|env\.py|script\.py\.mako|alembic\.ini)$/i;
/** An Alembic migration's parent revision, with or without a type annotation. */
const DOWN_REVISION = /^down_revision(?:\s*:[^=\n]+)?\s*=\s*['"]([^'"]+)['"]/m;

export interface AddedMigration {
  file: string;
  folder: string;
  /** The Alembic revision it follows, where it names one. */
  parent?: string;
}

export interface MigrationCollision {
  /** The other open work item. */
  item: string;
  branch: string;
  folder: string;
  /** Both name the same parent revision, so merging both makes two heads: certain, not just likely. */
  certain: boolean;
  message: string;
}

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", ["-c", "core.quotePath=false", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

const lines = (output: string | undefined): string[] => (output ?? "").split("\n").filter((line) => line !== "");

/** The migrations folder a file is in, such as services/api/alembic/versions, or undefined. */
export function migrationFolder(file: string): string | undefined {
  if (NOT_MIGRATION.test(file)) return undefined;
  const parts = file.split("/");
  for (let index = 0; index < parts.length - 1; index++) {
    const part = (parts[index] ?? "").toLowerCase();
    if (part === "alembic" && parts[index + 1] === "versions" && index + 2 < parts.length) {
      return parts.slice(0, index + 2).join("/");
    }
    if (FOLDERS.has(part)) return parts.slice(0, index + 1).join("/");
  }
  return undefined;
}

function migrations(files: string[], read: (file: string) => string): AddedMigration[] {
  return files.flatMap((file) => {
    const folder = migrationFolder(file);
    if (folder === undefined) return [];
    const parent = file.endsWith(".py") ? DOWN_REVISION.exec(read(file))?.[1] : undefined;
    return [{ file, folder, ...(parent === undefined ? {} : { parent }) }];
  });
}

/** The migrations the working copy adds since it left the default branch, committed or not. */
export function addedHere(root: string, defaultBranch?: string): AddedMigration[] {
  const base = forkPoint(root, defaultBranch);
  if (base === undefined) return [];
  const added = [
    ...lines(git(root, ["diff", "--name-only", "--no-renames", "--diff-filter=A", base, "--", ".", OWN_FILES])),
    ...lines(git(root, ["ls-files", "--others", "--exclude-standard", "--", ".", OWN_FILES])),
  ];
  return migrations([...new Set(added)], (file) => {
    try {
      return readFileSync(join(root, file), "utf8");
    } catch {
      return "";
    }
  });
}

/** The commit a branch name points at: the local branch, or the remote's copy of it. */
function tipOf(root: string, branch: string): string | undefined {
  for (const ref of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`]) {
    const commit = git(root, ["rev-parse", "--verify", "-q", `${ref}^{commit}`])?.trim();
    if (commit !== undefined && commit !== "") return commit;
  }
  return undefined;
}

/** The migrations a branch adds since it left the default branch, as committed. */
export function addedOn(root: string, branch: string, defaultBranch?: string): AddedMigration[] {
  const tip = tipOf(root, branch);
  if (tip === undefined) return [];
  const base = forkPoint(root, defaultBranch, tip);
  if (base === undefined) return [];
  const added = lines(
    git(root, ["diff", "--name-only", "--no-renames", "--diff-filter=A", base, tip, "--", ".", OWN_FILES]),
  );
  return migrations(added, (file) => git(root, ["show", `${tip}:${file}`]) ?? "");
}

/**
 * Where the current item's new migrations will collide with another open item's: same folder,
 * and for Alembic, the same parent revision. Warnings, never refusals: the order of merging is a
 * person's call.
 */
export function migrationCollisions(
  root: string,
  item: WorkItem,
  others: readonly WorkItem[],
  defaultBranch?: string,
): MigrationCollision[] {
  if (item.branch === undefined) return [];
  const mine =
    currentBranch(root) === item.branch ? addedHere(root, defaultBranch) : addedOn(root, item.branch, defaultBranch);
  if (mine.length === 0) return [];
  return others.flatMap((other) => {
    if (other.id === item.id || other.branch === undefined || other.branch === item.branch) return [];
    const theirs = addedOn(root, other.branch, defaultBranch);
    const folders = [...new Set(mine.map((migration) => migration.folder))].filter((folder) =>
      theirs.some((migration) => migration.folder === folder),
    );
    return folders.map((folder) => {
      const parents = new Set(mine.flatMap((migration) => (migration.folder === folder ? [migration.parent] : [])));
      const shared = theirs.find(
        (migration) => migration.folder === folder && migration.parent !== undefined && parents.has(migration.parent),
      )?.parent;
      const then = "Whichever merges second needs its migration re-parented, then reviewed again.";
      return {
        item: other.id,
        branch: other.branch ?? "",
        folder,
        certain: shared !== undefined,
        message:
          shared === undefined
            ? `${other.id} also adds a migration in ${folder}. ${then}`
            : `${other.id} also adds a migration in ${folder} on the same parent revision, ${shared}, so merging both makes two heads. ${then}`,
      };
    });
  });
}
