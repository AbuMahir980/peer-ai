import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { main } from "./cli.ts";
import { diagnose } from "./doctor.ts";
import {
  MIGRATION_ITEM,
  NOTES_FILE,
  code,
  escapes,
  fenced,
  packageScripts,
  runMigrate,
  ticketId,
  type MigrateOptions,
} from "./migrate.ts";
import { capture, cleanUp, project, scripted } from "./test-helpers.ts";
import { fingerprint, type Fingerprints } from "./v0.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-05T09:00:00Z");
const json = (value: unknown) => JSON.stringify(value, null, 2);

const SETUP = "# Setup\n\nAsk everything in one round.\n";
const README = "# Peer AI\n\nA development workflow.\n";
const RULES = "# Shared rules\n\nOne peer review before merge.\n";

/** A v0 history of one version, holding the files a Pantry copy left untouched. */
const FINGERPRINTS: Fingerprints = {
  versions: [{ commit: "cccc333", date: "2026-09-11" }],
  files: {
    "shared/00-setup.md": { [fingerprint(SETUP)]: [0] },
    "README.md": { [fingerprint(README)]: [0] },
    "shared/rules/shared.md": { [fingerprint(RULES)]: [0] },
  },
};

const DRIVER = [
  "# Workflow Driver",
  "",
  "You are **always** inside the development workflow.",
  "",
  "## 0. Project settings (filled in by setup)",
  "",
  "| Setting | Value |",
  "|---------|-------|",
  "| **Verify command** | `npm test` |",
  "| **Issue tracker** | GitHub Issues |",
  "| **Ticket prefix** | `PAN` |",
  "| **Remote** | `origin` |",
  "| **Design reference** | none |",
  "| **Branch naming** | `feature/PAN-XX-short-description` |",
  "| **Merge policy** | PR only |",
  "| **Questions for the designer** | `docs/open-items.md` |",
  "",
  "## 1. On every session start",
  "",
  "Read `.peer-ai-state.json` and `CONTEXT.md`.",
].join("\n");

/** A Pantry project on a pinned copy of v0, with the kinds of changes real copies had. */
const pantry = (): Record<string, string> => ({
  "package.json": json({
    name: "pantry",
    private: true,
    scripts: { test: "vitest", "peer-ai:check": "node peer-ai/check-upstream.mjs" },
    dependencies: { react: "19.0.0" },
  }),
  "src/main.tsx": "export {};\n",
  "CLAUDE.md": [
    "# Pantry",
    "",
    "A shared shopping list for a household.",
    "",
    "## On every session start",
    "",
    "Read the state file first.",
    "",
    "## House rules",
    "",
    "No real names in fixtures.",
    "",
    DRIVER,
    "",
  ].join("\n"),
  "CONTEXT.md": "# Pantry: context\n",
  ".gitignore": "docs-pdf/\nnode_modules/\n",
  "docs/standards/frontend-engineering-standards.md": "# Frontend standards\n",
  "docs/standards/standards-addendum.md": "# Addendum\n",
  "docs/standards/backend-engineering-standards.md": "# Backend standards\n",
  ".peer-ai-state.json": `\uFEFF${json({
    currentPhase: "build",
    currentStep: 3,
    phaseFile: "peer-ai/frontend/03-build.md",
    cycle: "M2: sharing",
    ticket: "PAN-7",
    ticketTitle: "Pantry list",
    ticketsCompleted: ["PAN-1"],
    ticketsInProgress: ["PAN-7"],
    ticketsRemaining: ["PAN-9", "PAN-10"],
    pendingAgents: [],
    lastVerifyResult: "pass",
    notes: "Next: the share sheet.",
  })}`,
  "peer-ai/.upstream": json({ _note: "pin", repo: "someone/peer-ai", ref: "main", commit: "cccc333" }),
  "peer-ai/shared/00-setup.md": SETUP,
  "peer-ai/README.md": README,
  "peer-ai/shared/rules/shared.md": `${RULES}\nOn Pantry: squash and merge.\n`,
  "peer-ai/shared/02-architect.md":
    "# Architect\n> **Model: Model A.**\n> **Skills to use here.** Inside this phase:\n> - `engineering:architecture` — options\n",
  "peer-ai/frontend/03-build.md": "# Build\n> **Model: Model B.**\n> Small commits, one ticket at a time.\n",
  "peer-ai/phase-config.json": json({
    _note: "Model A for everything, Model B for building.",
    "shared/02-architect.md": {
      model: "> **Model: Model A.**",
      block: ["> **Skills to use here.** Inside this phase:", "> - `engineering:architecture` — options"],
    },
    "frontend/03-build.md": { model: "> **Model: Model B.**", block: ["> Small commits, one ticket at a time."] },
  }),
  "peer-ai/apply-phase-config.ps1": "Write-Host 'stamping'\n",
});

function commitAll(root: string): void {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  git("add", "-A");
  git("-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-qm", "v0");
}

function committed(files: Record<string, string>): string {
  const root = project(files, { git: true });
  commitAll(root);
  return root;
}

const options = (root: string, extra: Partial<MigrateOptions> = {}): MigrateOptions => ({
  cwd: root,
  yes: true,
  dryRun: false,
  now: NOW,
  fingerprints: FINGERPRINTS,
  ...extra,
});

const read = (root: string, path: string) => readFileSync(join(root, path), "utf8");
const readJson = (root: string, path: string) => JSON.parse(read(root, path)) as Record<string, unknown>;

describe("peer-ai migrate", () => {
  it("converts the settings, moves v0's text out, and leaves the rest as notes and a work item", async () => {
    const root = committed(pantry());
    const out = capture();
    expect(await runMigrate(options(root), undefined, out)).toBe(0);

    const config = readJson(root, "peer-ai.config.json");
    expect(config).toMatchObject({
      project: { name: "pantry", origin: "existing" },
      tracks: [{ id: "pantry", kind: "web", status: "active" }],
      commands: { verify: "npm test" },
      tracker: { kind: "github", ticketPrefix: "PAN" },
      repo: { branchNaming: "feature/{ticket}-{slug}", mergePolicy: "pull-request" },
      models: { policy: "pinned", default: "Model A", byActivity: { build: "Model B" } },
      capabilities: {
        architecture: { also: ["engineering:architecture"] },
        "implement-ticket": { notes: ["Frontend: Small commits, one ticket at a time."] },
      },
      standards: {
        documents: [
          { path: "docs/standards/frontend-engineering-standards.md", role: "standard", scope: ["pantry"] },
          { path: "docs/standards/standards-addendum.md", role: "addendum" },
        ],
        onExisting: "map",
      },
    });
    expect(config).not.toHaveProperty("design");

    // The copy and the state file are gone; the project's own text stays, with Peer AI's block.
    expect(existsSync(join(root, "peer-ai"))).toBe(false);
    expect(existsSync(join(root, ".peer-ai-state.json"))).toBe(false);
    const claude = read(root, "CLAUDE.md");
    expect(claude).toContain("A shared shopping list for a household.\n\n## House rules\n\nNo real names in fixtures.");
    expect(claude).not.toContain("Workflow Driver");
    expect(claude).not.toContain("On every session start");
    expect(claude).toContain("<!-- peer-ai:start -->");
    expect(claude).toContain("Models: Model A by default; build: Model B.");
    expect(claude).toContain("- `peer-ai-architecture`: also use `engineering:architecture`.");
    expect(readJson(root, "package.json").scripts).toEqual({ test: "vitest" });

    const notes = read(root, NOTES_FILE);
    expect(notes).toContain("The copy came from v0 of 2026-09-11 (cccc333), as its `.upstream` pin said.");
    expect(notes).toContain("- Verify command → `commands.verify`: `npm test`");
    expect(notes).toContain("### 1. v0's text moved out of CLAUDE.md");
    expect(notes).toContain("Read `.peer-ai-state.json` and `CONTEXT.md`.");
    expect(notes).toContain("- Questions for the designer: `docs/open-items.md`");
    expect(notes).toContain(
      "- `docs/standards/backend-engineering-standards.md`: for the backend, and there is no backend part yet.",
    );
    expect(notes).toContain("Work in progress became work items: `PAN-7`.");
    expect(notes).toContain("PAN-9, PAN-10");
    expect(notes).toContain("> Next: the share sheet.");
    // The phase files phase-config.json stamped are edits too: v0 never had those lines.
    expect(notes).toContain("Files the project changed in peer-ai/ (3)");
    expect(notes).toContain(
      "- `peer-ai/frontend/03-build.md`\n- `peer-ai/shared/02-architect.md`\n- `peer-ai/shared/rules/shared.md`",
    );
    expect(notes).not.toContain("- `peer-ai/README.md`");
    expect(notes).toContain("`CONTEXT.md` stays");
    expect(notes).toContain("`.gitignore:1` names v0's folders: `docs-pdf/`");

    const ticket = readJson(root, ".peer-ai/work/PAN-7.json");
    expect(ticket).toMatchObject({
      title: "Pantry list",
      kind: "feature",
      stage: "build",
      track: "pantry",
      position: { activity: "build", step: 3 },
    });
    const migration = readJson(root, `.peer-ai/work/${MIGRATION_ITEM}.json`);
    expect(migration).toMatchObject({ kind: "migration", stage: "prepare", sources: [NOTES_FILE] });
    expect(migration.acceptance).toContain("Decided: Work carried over from v0's state.");
    expect(existsSync(join(root, ".peer-ai/map.json"))).toBe(true);

    expect(diagnose(root, "24.3.0").checks.filter((check) => check.status === "fail")).toEqual([]);
    expect(out.text()).toContain("✓ Carried over the work in progress: PAN-7.");
    expect(out.text()).toContain(`decisions are left in ${NOTES_FILE}`);
  });

  it("moves a June copy too: no settings to read, and a phase v0 doesn't have is dropped with a note", async () => {
    const root = committed({
      "index.html": "<!doctype html>\n",
      "CLAUDE.md": "# Pantry\n\n## On every session start\n\nRead the state.\n\n## The workflow\n\nPhases.\n",
      ".peer-ai-state.json": json({ currentPhase: "phase2-planned", currentStep: 0, ticketsCompleted: ["#1"] }),
      "peer-ai/shared/00-setup.md": SETUP,
    });
    expect(await runMigrate(options(root), undefined, capture())).toBe(0);
    const notes = read(root, NOTES_FILE);
    expect(notes).toContain("Nothing: the copy held no settings migrate could read.");
    expect(notes).toContain("The phase `phase2-planned` isn't one v0 has, so it was dropped.");
    expect(notes).toContain("Nothing was in progress, so no work items were carried over.");
    expect(read(root, "CLAUDE.md")).toMatch(/^# Pantry\n\n<!-- peer-ai:start -->/);
  });

  it("refuses when there is a config, no copy, no git, or uncommitted work", async () => {
    const configured = committed({ ...pantry(), "peer-ai.config.json": "{}" });
    let out = capture();
    expect(await runMigrate(options(configured), undefined, out)).toBe(1);
    expect(out.text()).toContain("already exists");

    out = capture();
    expect(await runMigrate(options(committed({ "README.md": "# Pantry\n" })), undefined, out)).toBe(1);
    expect(out.text()).toContain("There's no copy of v0 here");

    out = capture();
    expect(await runMigrate(options(project(pantry())), undefined, out)).toBe(1);
    expect(out.text()).toContain("migrate needs the project in git");

    const dirty = committed(pantry());
    writeFileSync(join(dirty, "src/main.tsx"), "export const changed = true;\n");
    out = capture();
    expect(await runMigrate(options(dirty), undefined, out)).toBe(1);
    expect(out.text()).toContain("There are uncommitted changes.");
    expect(out.text()).toContain("M src/main.tsx");
    expect(existsSync(join(dirty, "peer-ai.config.json"))).toBe(false);

    out = capture();
    expect(await runMigrate(options(committed(pantry()), { yes: false }), undefined, out)).toBe(2);
    expect(out.text()).toContain("pass --yes");
  });

  it("shows the plan with --dry-run and changes nothing, even with uncommitted work", async () => {
    const root = committed(pantry());
    writeFileSync(join(root, "src/main.tsx"), "export const changed = true;\n");
    const out = capture();
    expect(await runMigrate(options(root, { dryRun: true, yes: false }), undefined, out)).toBe(0);
    const text = out.text();
    expect(text).toContain("The copy came from v0 of 2026-09-11 (cccc333).");
    expect(text).toContain("  Verify command → commands.verify: npm test");
    expect(text).toContain("Would delete:\n  peer-ai/ (8 files)\n  .peer-ai-state.json");
    expect(text).toContain(`  ${MIGRATION_ITEM}`);
    expect(text).toContain("There are uncommitted changes");
    expect(existsSync(join(root, "peer-ai.config.json"))).toBe(false);
    expect(existsSync(join(root, "peer-ai/phase-config.json"))).toBe(true);
  });

  it("deletes only what git can bring back, and leaves ignored files where they are", async () => {
    const root = committed({
      ...pantry(),
      ".gitignore": "peer-ai/local/\n",
      "peer-ai/local/our-notes.md": "Notes only this machine has.\n",
    });
    expect(await runMigrate(options(root), undefined, capture())).toBe(0);
    expect(read(root, "peer-ai/local/our-notes.md")).toBe("Notes only this machine has.\n");
    expect(existsSync(join(root, "peer-ai/shared"))).toBe(false);
    expect(read(root, NOTES_FILE)).toContain("so they were left where they are: deleting them couldn't be undone.");
    expect(read(root, NOTES_FILE)).toContain("`peer-ai/local/our-notes.md`");
  });

  it("refuses a copy that is a git repository of its own, a symbolic link out of the project, or a subfolder", async () => {
    const nested = committed(pantry());
    mkdirSync(join(nested, "peer-ai/.git"));
    let out = capture();
    expect(await runMigrate(options(nested), undefined, out)).toBe(1);
    expect(out.text()).toContain("is a git repository of its own");

    const elsewhere = project({ "CLAUDE.md": "# Someone else's file\n" });
    const withoutClaude = Object.fromEntries(Object.entries(pantry()).filter(([path]) => path !== "CLAUDE.md"));
    const linked = project(withoutClaude, { git: true });
    symlinkSync(join(elsewhere, "CLAUDE.md"), join(linked, "CLAUDE.md"));
    commitAll(linked);
    out = capture();
    expect(await runMigrate(options(linked), undefined, out)).toBe(1);
    expect(out.text()).toContain(
      "lead outside the project through a symbolic link, so migrate would change files it can't undo: CLAUDE.md",
    );
    expect(read(elsewhere, "CLAUDE.md")).toBe("# Someone else's file\n");
    expect(escapes(linked, "docs/new.md")).toBe(false);

    const monorepo = committed({ "apps/pantry/peer-ai/shared/00-setup.md": SETUP });
    out = capture();
    expect(await runMigrate(options(join(monorepo, "apps/pantry")), undefined, out)).toBe(1);
    expect(out.text()).toContain("Run migrate from the repository's top folder");
  });

  it("sees untracked files even when git is set to hide them", async () => {
    const root = committed(pantry());
    execFileSync("git", ["config", "status.showUntrackedFiles", "no"], { cwd: root });
    writeFileSync(join(root, "scratch-notes.txt"), "mine\n");
    const out = capture();
    expect(await runMigrate(options(root), undefined, out)).toBe(1);
    expect(out.text()).toContain("?? scratch-notes.txt");
  });

  it("keeps the project's own text whole: a section after the driver, Windows line endings, code", async () => {
    const files = pantry();
    files["CLAUDE.md"] = [
      "# Pantry",
      "",
      "```python",
      "def a():",
      "    pass",
      "",
      "",
      "def b():",
      "    pass",
      "```",
      "",
      DRIVER,
      "",
      "## Deployment",
      "",
      "Ship on Fridays.",
      "",
    ].join("\r\n");
    const root = committed(files);
    expect(await runMigrate(options(root), undefined, capture())).toBe(0);
    const claude = read(root, "CLAUDE.md");
    expect(claude).toContain("    pass\r\n\r\n\r\ndef b():");
    expect(claude).toContain("## Deployment\r\n\r\nShip on Fridays.");
    expect(claude).not.toContain("Workflow Driver");
  });

  it("keeps the whole state file and phase-config.json, and points conflicts at the commit before", async () => {
    const files = pantry();
    files[".peer-ai-state.json"] = json({
      currentPhase: "review",
      currentStep: 2,
      phaseFile: "peer-ai/frontend/04-review.md",
      ticket: "PAN-7",
      ticketsInProgress: ["PAN-7"],
      tracks: { backend: { currentPhase: "build", currentStep: 1, notes: "API half done" } },
      decisions: ["Keep the list offline-first"],
    });
    files["peer-ai/frontend/03-build.md"] = "# Build\n> **Model: Model B.**\n> Rewritten since.\n";
    const root = committed(files);
    expect(await runMigrate(options(root), undefined, capture())).toBe(0);
    const notes = read(root, NOTES_FILE);
    const base = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    expect(notes).toContain(`Before the migration, the project was at commit \`${base}\`.`);
    expect(notes).toContain("The backend part had no ticket in progress; it was at `build`, step 1: API half done");
    expect(notes).toContain("## As v0 had them");
    expect(notes).toContain('"decisions": [');
    expect(notes).toContain("phase-config.json blocks the project has changed since");
    expect(notes).toContain(`\`git show ${base}:peer-ai/frontend/03-build.md\``);
    // Carried over at its stage, with no reviews worked out from migrate's own changes.
    const ticket = readJson(root, ".peer-ai/work/PAN-7.json");
    expect(ticket).toMatchObject({ stage: "verify", position: { activity: "verify", step: 2 } });
    expect(ticket).not.toHaveProperty("requiredReviews");
  });

  it("says when the migration was applied but a step didn't finish", async () => {
    const root = committed({ ...pantry(), ".peer-ai/work/PAN-7.json": "{}" });
    const out = capture();
    expect(await runMigrate(options(root), undefined, out)).toBe(1);
    expect(out.text()).toContain("The migration was applied, but some steps didn't finish:");
    expect(out.text()).toContain('The work item PAN-7 already exists, so "Pantry list" wasn\'t carried over.');
    expect(existsSync(join(root, "peer-ai.config.json"))).toBe(true);
  });

  it("sets up the CI gate on GitHub Actions, and notes that only the owner can make it required", async () => {
    const root = committed({
      ...pantry(),
      ".github/workflows/ci.yml":
        "name: CI\non: pull_request\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n",
    });
    expect(await runMigrate(options(root), undefined, capture())).toBe(0);
    expect(read(root, ".github/workflows/peer-ai.yml")).toContain("name: peer-ai check");
    expect(read(root, NOTES_FILE)).toContain("Make Peer AI's CI gate a required check");
    expect(diagnose(root, "24.3.0").checks.find((check) => check.id === "gate")?.status).toBe("ok");
  });

  it("asks init's questions in a terminal", async () => {
    const root = committed(pantry());
    const prompter = scripted([
      "Pantry",
      "",
      true,
      "team",
      "production",
      "high",
      [],
      "Not yet: the pantry is a prototype.",
    ]);
    expect(await runMigrate(options(root, { yes: false }), prompter, capture())).toBe(0);
    expect(prompter.asked[0]).toBe("What are you building? Give it a name.");
    const config = readJson(root, "peer-ai.config.json");
    expect(config.project).toMatchObject({
      name: "Pantry",
      team: "team",
      stage: "production",
    });
    // What assess suggests is asked about too, as init asks (RFC 0011): turned down here, with why.
    expect(prompter.asked[6]).toContain("Untick any that don't fit.");
    expect(config.declined).toContainEqual(expect.objectContaining({ reason: "Not yet: the pantry is a prototype." }));
  });

  it("runs from the command line", async () => {
    const root = committed(pantry());
    const out = capture();
    expect(await main(["migrate", "--yes"], { cwd: root, out })).toBe(0);
    expect(existsSync(join(root, "peer-ai.config.json"))).toBe(true);
  });
});

describe("migrate's helpers", () => {
  it("turn v0 tickets into work item ids", () => {
    expect(ticketId("PAN-7", "PAN")).toBe("PAN-7");
    expect(ticketId("#12", "PAN")).toBe("PAN-12");
    expect(ticketId("12", undefined)).toBe("ITEM-12");
    expect(ticketId("the cart", undefined)).toBeUndefined();
  });

  it("remove only the package.json scripts that do nothing but run v0's files", () => {
    const text = json({
      name: "pantry",
      scripts: {
        lint: "eslint . --ignore-pattern peer-ai/",
        verify: "npm run lint && vitest run && node peer-ai/check-upstream.mjs",
        "peer-ai:check": "node peer-ai/check-upstream.mjs",
        stamp: "pwsh -File peer-ai/apply-phase-config.ps1 && node ./peer-ai/check-upstream.mjs",
        test: "vitest",
      },
    });
    const result = packageScripts(`${text}\n`);
    expect(result.edit?.removed).toEqual([
      { name: "peer-ai:check", command: "node peer-ai/check-upstream.mjs" },
      { name: "stamp", command: "pwsh -File peer-ai/apply-phase-config.ps1 && node ./peer-ai/check-upstream.mjs" },
    ]);
    expect(result.mentions.map((script) => script.name)).toEqual(["lint", "verify"]);
    expect(JSON.parse(result.edit?.text ?? "{}")).toMatchObject({
      scripts: {
        lint: "eslint . --ignore-pattern peer-ai/",
        verify: "npm run lint && vitest run && node peer-ai/check-upstream.mjs",
        test: "vitest",
      },
    });
    expect(result.edit?.text.endsWith("}\n")).toBe(true);
    expect(packageScripts(json({ scripts: { test: "vitest" } }))).toEqual({ mentions: [] });
  });

  it("quote any text, backticks and fences included", () => {
    expect(code("npm test")).toBe("`npm test`");
    expect(code("use `npm test`")).toBe("`` use `npm test` ``");
    expect(fenced("```js\nx\n```")).toEqual(["````", "```js", "x", "```", "````"]);
    expect(fenced("plain", "md")).toEqual(["```md", "plain", "```"]);
  });
});
