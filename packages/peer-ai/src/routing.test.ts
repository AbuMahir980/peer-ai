import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SKILL_IDS, type PeerAiConfig, type SkillId, type WorkItem } from "peer-ai-workflow";
import { availableSkills } from "peer-ai-skills";
import { afterEach, describe, expect, it } from "vitest";
import { assess, loadConfig } from "./assess.ts";
import { gateWorkItem } from "./check.ts";
import type { Stage } from "./init.ts";
import { changedFiles, gapSkills, reviewsFor, reviewsToDo } from "./routing.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { advanceWorkItem, createWorkItem, nextWork } from "./work.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");
const json = (value: unknown) => JSON.stringify(value);

const CONFIG = {
  version: 1,
  project: { name: "Menu", stage: "mvp", traits: ["ai-features"] },
  design: { status: "exists", reference: "https://design.example/menu" },
  tracks: [
    { id: "web", kind: "web", path: "apps/web", status: "active" },
    { id: "api", kind: "backend", path: "services/api", status: "active" },
  ],
  apis: [
    {
      id: "menu-api",
      kind: "http",
      providedBy: "api",
      contract: { source: "openapi", location: "services/api/openapi.json" },
    },
  ],
  tracker: { kind: "linear", ticketPrefix: "MENU" },
};

function configured(extra: Record<string, unknown> = {}, files: Record<string, string> = {}): [string, PeerAiConfig] {
  const root = project({ "peer-ai.config.json": json({ ...CONFIG, ...extra }), ...files });
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return [root, config];
}

const reviews = (files: Record<string, string>, stage: Stage = "mvp", extra: Record<string, unknown> = {}) => {
  const [, config] = configured(extra);
  return reviewsFor(Object.keys(files), config, stage, (file) => files[file] ?? "", SKILL_IDS);
};

describe("the skill for each gap", () => {
  it("names the installed skill that fills a gap, and only ones that exist", () => {
    expect(gapSkills(["architecture", "data-inventory", "ci", "tests"], ["architecture", "compliance-review"])).toEqual(
      {
        architecture: "peer-ai-architecture",
        "data-inventory": "peer-ai-compliance-review",
      },
    );
    expect(gapSkills(["specs"], ["system-design"])).toEqual({ specs: "peer-ai-system-design" });
  });
});

describe("the reviews a change needs", () => {
  it("works them out from the files it touched, each with its reason", () => {
    expect(
      reviews({
        "apps/web/src/menu.tsx": "export const Menu = () => null;",
        "services/api/app/routes.py": "from openai import OpenAI",
        "services/api/migrations/0002_guests.sql": "ALTER TABLE guests ADD phone_number TEXT;",
        "apps/web/package.json": "{}",
        "infra/main.tf": "",
      }),
    ).toEqual([
      { skill: "code-review", reason: "it changes code" },
      { skill: "security-review", reason: "it changes code, at the mvp stage" },
      { skill: "accessibility-review", reason: "it changes a screen" },
      { skill: "design-review", reason: "it changes a screen, and the project has a design" },
      { skill: "contract-check", reason: "it changes an API or its contract" },
      { skill: "data-migration-review", reason: "it changes a migration" },
      { skill: "dependency-review", reason: "it changes a dependency file or lockfile" },
      { skill: "compliance-review", reason: "it changes where personal data is kept" },
      { skill: "ai-feature-review", reason: "it changes code that calls an AI model" },
      { skill: "infrastructure-review", reason: "it changes infrastructure or deployment" },
    ]);
  });

  it("asks less of a prototype and more of production, and nothing extra for tests or docs alone", () => {
    const code = { "services/api/app/routes.py": "def menu(): ..." };
    // An API change needs its contract checked at any stage; security review starts at MVP.
    expect(reviews(code, "prototype").map((review) => review.skill)).toEqual(["code-review", "contract-check"]);
    expect(reviews(code, "production").map((review) => review.skill)).toEqual([
      "code-review",
      "security-review",
      "contract-check",
      "release-readiness",
    ]);
    expect(reviews({ "services/api/tests/test_menu.py": "" }).map((review) => review.skill)).toEqual(["code-review"]);
    expect(reviews({ "docs/menu.md": "" })).toEqual([]);
  });

  it("checks a work item against its acceptance criteria, from MVP, when it has some", () => {
    const [, config] = configured();
    const change = ["services/api/app/routes.py"];
    const criteria = { acceptance: ["Given a full slot, when a cyclist books it, then it's refused."] };
    const skills = (stage: Stage, item = {}) =>
      reviewsFor(change, config, stage, () => "", SKILL_IDS, item).map((review) => review.skill);
    expect(reviewsFor(change, config, "mvp", () => "", SKILL_IDS, criteria)).toContainEqual({
      skill: "qa-acceptance",
      reason: "its work item has acceptance criteria, which must all hold before it ships",
    });
    expect(skills("mvp")).not.toContain("qa-acceptance");
    expect(skills("mvp", { acceptance: [] })).not.toContain("qa-acceptance");
    expect(skills("prototype", criteria)).not.toContain("qa-acceptance");
  });

  it("follows the project's config, and requires only skills that exist", () => {
    const code = { "services/api/app/routes.py": "def menu(): ..." };
    const extra = {
      activities: {
        verify: {
          reviews: {
            require: ["performance-review"],
            skip: [{ skill: "contract-check", reason: "Internal API only" }],
          },
        },
      },
    };
    expect(reviews(code, "mvp", extra).map((review) => review.skill)).toEqual([
      "code-review",
      "security-review",
      "performance-review",
    ]);
    const [, config] = configured();
    expect(reviewsFor(Object.keys(code), config, "mvp", () => "", ["security-review"])).toEqual([
      { skill: "security-review", reason: "it changes code, at the mvp stage" },
    ]);
  });
});

describe("the files a change touched", () => {
  const git = (root: string, ...args: string[]) =>
    execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd: root });
  const write = (root: string, path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };

  it("counts what the branch committed and what isn't committed yet, not what was already on main", () => {
    const root = project({ "README.md": "# Menu" }, { git: true });
    git(root, "checkout", "-q", "-b", "main");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "Start");
    git(root, "checkout", "-q", "-b", "feature/menu");
    write(root, "services/api/app/routes.py", "def menu(): ...");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "Menu route");
    write(root, "apps/web/src/menu.tsx", "export {};");
    expect(changedFiles(root)).toEqual(["apps/web/src/menu.tsx", "services/api/app/routes.py"]);
  });

  it("stores the reviews on the work item when it reaches verify, and next_work lists them", () => {
    const [root, config] = configured({}, { "services/api/app/routes.py": "def menu(): ..." });
    execFileSync("git", ["init", "-q", "-b", "feature/MENU-1-menu"], { cwd: root });
    const created = createWorkItem(
      root,
      config,
      {
        title: "Menu",
        kind: "feature",
        track: "api",
        branch: "feature/MENU-1-menu",
        acceptance: ["Given a closed kitchen, when a guest opens the menu, then it says when it opens."],
      },
      NOW,
    );
    if (!created.ok) throw new Error(created.error);
    advanceWorkItem(root, config, "MENU-1", "build", NOW);
    const moved = advanceWorkItem(root, config, "MENU-1", "verify", NOW);
    if (!moved.ok) throw new Error(moved.error);
    // Only reviews whose skills are written are required; the rest follow as they're written.
    const needed = [
      { skill: "code-review", reason: "it changes code" },
      { skill: "security-review", reason: "it changes code, at the mvp stage" },
      { skill: "contract-check", reason: "it changes an API or its contract" },
      { skill: "qa-acceptance", reason: "its work item has acceptance criteria, which must all hold before it ships" },
    ].filter((review) => availableSkills().includes(review.skill as SkillId));
    expect(moved.value.requiredReviews).toEqual(needed);
    expect(nextWork(root, config).reviews).toEqual(
      needed.map((review) => ({
        ...review,
        use: `peer-ai-${review.skill}`,
        done: false,
        // The rules each answers for: those its changed files can break (RFC 0016).
        rules: expect.any(Array) as unknown,
      })),
    );
  });
});

describe("the gate on required reviews", () => {
  const item = (recorded: boolean): WorkItem => ({
    version: 1,
    id: "MENU-1",
    title: "Menu",
    kind: "feature",
    stage: "ship",
    requiredReviews: [{ skill: "security-review", reason: "it changes code, at the mvp stage" }],
    ...(recorded
      ? { reviews: [{ skill: "security-review", result: "pass", report: "r.json", at: NOW.toISOString() }] }
      : {}),
    next: "Merge it",
    updatedAt: NOW.toISOString(),
  });

  it("warns for an MVP, refuses in production, and says nothing for a prototype or a review that's done", () => {
    const [root, config] = configured();
    const gate = (recorded: boolean, stage: Stage) =>
      gateWorkItem(item(recorded), config, stage, assess(root, config, stage)).filter((check) =>
        check.message.includes("security-review"),
      );
    const message =
      "MENU-1 is at ship, but it has no security-review, which it needs because it changes code, at the mvp stage.";
    expect(gate(false, "mvp")).toEqual([
      {
        id: "gates",
        status: "warn",
        message,
        fix: "Use the peer-ai-security-review skill and record its review, or move the item back to build.",
      },
    ]);
    expect(gate(false, "production").map((check) => check.status)).toEqual(["fail"]);
    expect(gate(false, "prototype")).toEqual([]);
    expect(gate(true, "production")).toEqual([]);
    expect(reviewsToDo(item(true))).toMatchObject([{ done: true }]);
  });
});
