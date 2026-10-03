import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assess, toMap } from "./assess.ts";
import { flagEvidence, type EvidenceContext } from "./document-evidence.ts";
import { listRepoFiles } from "./files.ts";
import { formatReport } from "./report.ts";
import { cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-03T09:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

/** A commit at a given time, writing each file given, or deleting it when it's null. */
function commit(root: string, at: string, files: Record<string, string | null>): void {
  for (const [file, content] of Object.entries(files)) {
    if (content === null) rmSync(join(root, file));
    else {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), content);
    }
  }
  const env = { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at };
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
      { cwd: root, env, stdio: "ignore" },
    );
  git("add", "-A");
  git("commit", "-qm", `change at ${at}`);
}

function context(root: string, extra: Partial<EvidenceContext> = {}): EvidenceContext {
  return {
    root,
    files: listRepoFiles(root),
    tracks: [{ path: "services/api", status: "active" }],
    read: (file) => execFileSync("cat", [file], { cwd: root, encoding: "utf8" }),
    now: NOW.getTime(),
    ...extra,
  };
}

describe("the map judges a document's evidence (RFC 0018)", { timeout: 20_000 }, () => {
  it("counts only the first of byte-for-byte duplicates, with no history needed", () => {
    const root = project({
      "docs/prd.md": "# What we're building\n",
      "docs/requirements.md": "# What we're building\n",
      "docs/architecture.md": "# What we're building\n",
    });
    const { items } = assess(root, undefined, "mvp");
    expect(items.requirements).toMatchObject({
      status: "present",
      flagged: [{ file: "docs/requirements.md", reason: "docs/requirements.md is the same as docs/prd.md" }],
    });
    expect(items.architecture).toMatchObject({
      status: "partial",
      note: "docs/architecture.md is the same as docs/prd.md",
    });
    const map = toMap(assess(root, undefined, "mvp"), NOW);
    expect(map.items.architecture?.flagged).toEqual([
      { file: "docs/architecture.md", reason: "docs/architecture.md is the same as docs/prd.md" },
    ]);
    expect(formatReport(assess(root, undefined, "mvp"), "mvp").join("\n")).toContain(
      "Documents that may no longer hold. Bring each up to date, or list it in docs.settled",
    );
  });

  it("calls a document stale when its part has had many commits since it last changed", () => {
    const root = project({}, { git: true });
    commit(root, daysAgo(200), {
      "docs/architecture.md": "# How it fits together\n",
      "services/api/docs/design.md": "# The API\n",
      "services/api/main.py": "app = 1\n",
      "services/api/a.py": "a = 1\n",
      "services/api/b.py": "b = 1\n",
      "services/api/c.py": "c = 1\n",
      ...Object.fromEntries(["1", "2", "3", "4", "5", "6"].map((name) => [`lib/${name}.py`, `x = ${name}\n`])),
    });
    commit(root, daysAgo(100), { "services/api/main.py": "app = 2\n" });
    commit(root, daysAgo(60), { "web/index.ts": "export {};\n" });
    commit(root, daysAgo(10), { "README.md": "# Shop\n" });
    const flagged = flagEvidence(
      ["docs/architecture.md", "services/api/docs/design.md"],
      context(root, { manyCommits: 2 }),
    );
    expect(Object.fromEntries(flagged)).toEqual({
      "docs/architecture.md": `docs/architecture.md was last changed ${daysAgo(200).slice(0, 10)}, and the project has had 2 commits since`,
      "services/api/docs/design.md": `services/api/docs/design.md was last changed ${daysAgo(200).slice(0, 10)}, and 1 of services/api's 4 files have changed since`,
    });
    // Recent enough, or its code hardly moved: not stale.
    expect(flagEvidence(["docs/architecture.md"], context(root, { manyCommits: 2, staleDays: 365 })).size).toBe(0);
    expect(flagEvidence(["docs/architecture.md"], context(root)).size).toBe(0);
  });

  it("calls a document about something gone when it names a deleted path or a retired part", () => {
    const root = project({}, { git: true });
    commit(root, daysAgo(30), {
      "apps/mobile/App.tsx": "export default 1;\n",
      "services/legacy/server.ts": "export {};\n",
      "docs/architecture.md": "The app is in `apps/mobile`, beside [the API](../services/api/main.py).\n",
      "docs/plan.md": "Next we add `apps/admin/index.ts`.\n",
      "docs/legacy.md": "The old server is `services/legacy/server.ts`.\n",
      "docs/decisions/0001-mobile.md": "We chose `apps/mobile`.\n",
      "services/api/main.py": "app = 1\n",
    });
    commit(root, daysAgo(20), { "apps/mobile/App.tsx": null });
    const ctx = context(root, {
      tracks: [
        { path: "services/api", status: "active" },
        { path: "services/legacy", status: "retired" },
      ],
      settled: ["docs/decisions/"],
    });
    expect(
      Object.fromEntries(
        flagEvidence(["docs/architecture.md", "docs/plan.md", "docs/legacy.md", "docs/decisions/0001-mobile.md"], ctx),
      ),
    ).toEqual({
      "docs/architecture.md": "docs/architecture.md names apps/mobile, which no longer exists",
      "docs/legacy.md": "docs/legacy.md names services/legacy/server.ts, a part that's retired",
    });
  });
});
