import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { WorkItem } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { migrationCollisions, migrationFolder } from "./migrations.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { createWorkItem, nextWork } from "./work.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-03T09:00:00Z");
const git = (cwd: string, ...args: string[]) =>
  execFileSync(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
const VERSIONS = "services/api/alembic/versions";
const alembic = (revision: string, parent: string, annotated = false) =>
  [
    `revision = "${revision}"`,
    annotated ? `down_revision: Union[str, None] = "${parent}"` : `down_revision = '${parent}'`,
    "",
  ].join("\n");

/** A branch from main that commits the files given, leaving main checked out. */
function branch(root: string, name: string, files: Record<string, string>): void {
  git(root, "switch", "-qc", name, "main");
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  git(root, "add", "-A", "--", ".", ":(exclude).peer-ai");
  git(root, "commit", "-qm", name);
  git(root, "switch", "-q", "main");
}

function shop(): string {
  const root = project(
    {
      "peer-ai.config.json": JSON.stringify({
        version: 1,
        project: { name: "Shop", stage: "mvp" },
        tracks: [{ id: "api", kind: "backend", path: "services/api", status: "active" }],
        tracker: { kind: "linear", ticketPrefix: "SHOP" },
      }),
      [`${VERSIONS}/0001_start.py`]: alembic("0001", "none"),
      "services/api/alembic/env.py": "",
    },
    { git: true },
  );
  git(root, "symbolic-ref", "HEAD", "refs/heads/main");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "start");
  branch(root, "feature/SHOP-1", { [`${VERSIONS}/0002_orders.py`]: alembic("0002a", "0001") });
  branch(root, "feature/SHOP-2", { [`${VERSIONS}/0002_refunds.py`]: alembic("0002b", "0001", true) });
  branch(root, "feature/SHOP-3", { "services/api/db/migrate/20261001_add_notes.rb": "class AddNotes; end\n" });
  branch(root, "feature/SHOP-4", { "services/api/app.py": "app = 1\n" });
  branch(root, "feature/SHOP-5", { [`${VERSIONS}/0003_totals.py`]: alembic("0003", "0002x") });
  return root;
}

const item = (id: string): WorkItem => ({ id, branch: `feature/${id}` }) as WorkItem;

describe("migrations that will collide (RFC 0018)", { timeout: 20_000 }, () => {
  it("knows the folders migrations live in", () => {
    expect(migrationFolder(`${VERSIONS}/0002_orders.py`)).toBe(VERSIONS);
    expect(migrationFolder("shop/orders/migrations/0004_split_name.py")).toBe("shop/orders/migrations");
    expect(migrationFolder("db/migrate/20261001_add_notes.rb")).toBe("db/migrate");
    expect(migrationFolder("prisma/migrations/20261001_init/migration.sql")).toBe("prisma/migrations");
    expect(migrationFolder("drizzle/0001_orders.sql")).toBe("drizzle");
    expect(migrationFolder("shop/orders/migrations/__init__.py")).toBeUndefined();
    expect(migrationFolder("services/api/alembic/env.py")).toBeUndefined();
    expect(migrationFolder("services/api/app.py")).toBeUndefined();
  });

  it("names the other branches adding a migration in the same folder, and is certain on the same parent", () => {
    const root = shop();
    const others = ["SHOP-2", "SHOP-3", "SHOP-4", "SHOP-5", "SHOP-9"].map(item);
    expect(migrationCollisions(root, item("SHOP-1"), others)).toEqual([
      {
        item: "SHOP-2",
        branch: "feature/SHOP-2",
        folder: VERSIONS,
        certain: true,
        message: `SHOP-2 also adds a migration in ${VERSIONS} on the same parent revision, 0001, so merging both makes two heads. Whichever merges second needs its migration re-parented, then reviewed again.`,
      },
      {
        item: "SHOP-5",
        branch: "feature/SHOP-5",
        folder: VERSIONS,
        certain: false,
        message: `SHOP-5 also adds a migration in ${VERSIONS}. Whichever merges second needs its migration re-parented, then reviewed again.`,
      },
    ]);
    // A branch that adds no migration reads no other branch.
    expect(migrationCollisions(root, item("SHOP-4"), [item("SHOP-1")])).toEqual([]);
  });

  it("tells next_work on the current branch, from the working copy", () => {
    const root = shop();
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    for (const id of ["SHOP-1", "SHOP-2"]) {
      const created = createWorkItem(root, config, { id, title: id, kind: "feature", branch: `feature/${id}` }, NOW);
      if (!created.ok) throw new Error(created.error);
    }
    git(root, "switch", "-q", "feature/SHOP-1");
    expect(nextWork(root, config).migrationCollisions?.map((collision) => collision.item)).toEqual(["SHOP-2"]);
    git(root, "switch", "-q", "main");
    expect(nextWork(root, config).migrationCollisions).toBeUndefined();
  });
});
