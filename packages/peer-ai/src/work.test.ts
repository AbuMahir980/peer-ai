import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MAP_ITEM_SKILLS, type KnownMapItemId, type PeerAiConfig } from "@peer-ai/workflow";
import { availableSkills, renderedName, skillRuleIds } from "@peer-ai/skills";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { cleanUp, project } from "./test-helpers.ts";
import {
  advanceWorkItem,
  branchFor,
  createWorkItem,
  currentBranch,
  nextWork,
  recordReview,
  recordVerify,
  runCommand,
  runVerify,
  updateWorkItem,
  type CommandRunner,
} from "./work.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const json = (value: unknown) => JSON.stringify(value);

const SHOP = {
  version: 1,
  project: { name: "Shop", stage: "mvp" },
  tracks: [
    { id: "web", kind: "web", path: "apps/web", status: "active" },
    { id: "api", kind: "backend", path: "services/api", status: "active" },
  ],
  tracker: { kind: "linear", ticketPrefix: "SHOP" },
  repo: { branchNaming: "feature/{ticket}-{slug}" },
  commands: { verify: "npm test" },
};

function shop(config: Record<string, unknown> = SHOP, options: { git?: boolean } = {}): [string, PeerAiConfig] {
  const root = project(
    {
      "peer-ai.config.json": json(config),
      "apps/web/package.json": json({ dependencies: { react: "19.0.0" } }),
      "services/api/requirements.txt": "fastapi\n",
    },
    options,
  );
  const { config: loaded } = loadConfig(root);
  if (loaded === undefined) throw new Error("the test config is not valid");
  return [root, loaded];
}

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const error = (result: { ok: boolean; error?: string }) => (result.ok ? undefined : result.error);

describe("creating work items", () => {
  it("numbers them from the tracker's prefix and names their branch from the repo's pattern", () => {
    const [root, config] = shop();
    const first = value(createWorkItem(root, config, { title: "Add a cart!", kind: "feature", track: "web" }, NOW));
    expect(first).toMatchObject({
      id: "SHOP-1",
      stage: "prepare",
      track: "web",
      branch: "feature/SHOP-1-add-a-cart",
      next: "Read what this item needs, then plan it.",
      updatedAt: NOW.toISOString(),
    });
    expect(value(createWorkItem(root, config, { title: "Fix totals", kind: "bug" }, NOW)).id).toBe("SHOP-2");
    const written = JSON.parse(readFileSync(join(root, ".peer-ai/work/SHOP-1.json"), "utf8")) as { $schema: string };
    expect(written.$schema).toMatch(/work-item\.schema\.json$/);
  });

  it("uses a tracker key when given one, and refuses a duplicate or an unknown track", () => {
    const [root, config] = shop();
    expect(value(createWorkItem(root, config, { id: "GH-42", title: "Issue", kind: "bug" }, NOW)).id).toBe("GH-42");
    expect(error(createWorkItem(root, config, { id: "GH-42", title: "Again", kind: "bug" }, NOW))).toBe(
      'A work item "GH-42" already exists.',
    );
    expect(error(createWorkItem(root, config, { title: "App", kind: "feature", track: "mobile" }, NOW))).toBe(
      'There is no track "mobile". The tracks are: web, api.',
    );
  });

  it("puts work on the only track when there is one, and needs a gap for gap work", () => {
    const [root, config] = shop({ ...SHOP, tracks: [SHOP.tracks[0]], tracker: undefined, repo: undefined });
    const item = value(createWorkItem(root, config, { title: "Tests", kind: "chore" }, NOW));
    expect(item).toMatchObject({ id: "ITEM-1", track: "web" });
    expect(item).not.toHaveProperty("branch");
    expect(error(createWorkItem(root, config, { title: "Threats", kind: "gap" }, NOW))).toMatch(
      /a gap work item names the map item it fills/,
    );
  });

  it("fills a branch pattern only when it knows every placeholder", () => {
    expect(branchFor("{ticket}/{slug}", "SHOP-3", "  Checkout: v2 ")).toBe("SHOP-3/checkout-v2");
    expect(branchFor("{user}/{ticket}", "SHOP-3", "x")).toBeUndefined();
    expect(branchFor(undefined, "SHOP-3", "x")).toBeUndefined();
  });
});

describe("moving work items", () => {
  it("records where work stopped without erasing what it wasn't given", () => {
    const [root, config] = shop();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    const updated = value(
      updateWorkItem(
        root,
        config,
        "SHOP-1",
        { next: "Write the totals test", position: { activity: "build", step: 2 }, title: undefined },
        later(5),
      ),
    );
    expect(updated).toMatchObject({
      title: "Cart",
      next: "Write the totals test",
      position: { activity: "build", step: 2 },
      updatedAt: later(5).toISOString(),
    });
    expect(error(updateWorkItem(root, config, "SHOP-9", { next: "x" }, NOW))).toBe('There is no work item "SHOP-9".');
  });

  it("goes through the stages, and won't ship without a passing verify and reviews", () => {
    const [root, config] = shop();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    expect(value(advanceWorkItem(root, config, "SHOP-1", undefined, NOW)).stage).toBe("build");
    expect(value(advanceWorkItem(root, config, "SHOP-1", undefined, NOW)).stage).toBe("verify");
    expect(error(advanceWorkItem(root, config, "SHOP-1", undefined, NOW))).toBe(
      "SHOP-1 can't move to ship yet:\n- SHOP-1 is at ship, but it has no recorded verify. Run npm test and record the result on the work item, or move the item back to build.",
    );

    value(recordVerify(root, config, "SHOP-1", "pass", later(1)));
    value(recordReview(root, config, "SHOP-1", { skill: "code-review", result: "fail" }, later(2)));
    expect(error(advanceWorkItem(root, config, "SHOP-1", "ship", NOW))).toContain("its latest code-review failed");
    value(recordReview(root, config, "SHOP-1", { skill: "code-review", result: "pass" }, later(3)));
    expect(value(advanceWorkItem(root, config, "SHOP-1", "ship", NOW)).stage).toBe("ship");
    expect(value(advanceWorkItem(root, config, "SHOP-1", undefined, NOW)).stage).toBe("done");
    expect(error(advanceWorkItem(root, config, "SHOP-1", undefined, NOW))).toBe("SHOP-1 is already done.");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "build", NOW)).stage).toBe("build");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "cancelled", NOW)).stage).toBe("cancelled");
  });

  it("keeps a plan on a work item, and won't ship it before the items it depends on (RFC 0005)", () => {
    const [root, config] = shop({ ...SHOP, commands: { verify: null } });
    value(createWorkItem(root, config, { title: "Store the new due date", kind: "feature", track: "api" }, NOW));
    const screen = value(
      createWorkItem(
        root,
        config,
        {
          title: "Extend a loan from the loan card",
          kind: "feature",
          track: "web",
          goal: "A reader extends their own loan by a week from the loan card.",
          acceptance: ["Given a loan due Friday, when the reader extends it, then it's due the Friday after."],
          sources: ["docs/specs/extend-a-loan.md"],
          dependsOn: ["SHOP-1"],
        },
        later(1),
      ),
    );
    expect(screen).toMatchObject({
      goal: "A reader extends their own loan by a week from the loan card.",
      sources: ["docs/specs/extend-a-loan.md"],
    });
    expect(nextWork(root, config).waiting).toEqual({ "SHOP-2": ["SHOP-1"] });

    // Building before a dependency ships is fine; shipping before it isn't.
    expect(value(advanceWorkItem(root, config, "SHOP-2", "build", later(2))).stage).toBe("build");
    expect(error(advanceWorkItem(root, config, "SHOP-2", "ship", later(3)))).toBe(
      "SHOP-2 can't move to ship yet:\n- SHOP-2 is at ship, but it depends on SHOP-1, which is only at prepare. Ship SHOP-1 first, or move the item back to build.",
    );
    value(advanceWorkItem(root, config, "SHOP-1", "ship", later(4)));
    expect(nextWork(root, config).waiting).toBeUndefined();
    expect(value(advanceWorkItem(root, config, "SHOP-2", "ship", later(5))).stage).toBe("ship");

    const replanned = value(updateWorkItem(root, config, "SHOP-2", { acceptance: ["A new criterion."] }, later(6)));
    expect(replanned.acceptance).toEqual(["A new criterion."]);
    expect(replanned.goal).toBe(screen.goal);
    expect(error(updateWorkItem(root, config, "SHOP-2", { dependsOn: ["SHOP-2"] }, later(7)))).toContain(
      "a work item can't depend on itself",
    );
  });

  it("won't close a gap that a fresh assessment still finds", () => {
    const [root, config] = shop({ ...SHOP, commands: { verify: null } });
    value(createWorkItem(root, config, { title: "Threat model", kind: "gap", gap: "threat-model" }, NOW));
    expect(value(advanceWorkItem(root, config, "SHOP-1", "ship", NOW)).stage).toBe("ship");
    expect(error(advanceWorkItem(root, config, "SHOP-1", "done", NOW))).toContain(
      "says the threat-model gap is done, but a fresh assessment finds it missing",
    );
    writeFileSync(join(root, "threat-model.md"), "# Threat model");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "done", NOW)).stage).toBe("done");
  });
});

describe("recording reviews", () => {
  const REPORT = ".peer-ai/reports/SHOP-1/security-review.json";
  // A report must give every one of the skill's rules a line; the rest don't apply to this change.
  const failing = { rule: "SEC-01", item: "route:GET /orders/{id}", status: "fail", finding: "F1" };
  const others = skillRuleIds("security-review")
    .filter((rule) => rule !== "SEC-01")
    .map((rule) => ({ rule, status: "not-applicable", reason: "Nothing in this change is of its kind." }));
  const report = (changes: Record<string, unknown> = {}) => ({
    version: 1,
    skill: "security-review",
    workItem: "SHOP-1",
    at: NOW.toISOString(),
    scope: { tracks: ["api"] },
    inputs: ["docs/architecture.md"],
    inventory: [{ id: "route:GET /orders/{id}", kind: "route" }],
    coverage: [failing, ...others],
    findings: [
      {
        id: "F1",
        rule: "SEC-01",
        severity: "high",
        status: "open",
        title: "Any signed-in user can read another user's order",
        location: { file: "services/api/orders.ts", line: 58 },
        evidence: "getOrder never checks the owner.",
      },
    ],
    result: "pass",
    summary: "One high problem, below the blocking level.",
    ...changes,
  });
  const withReport = (content: unknown, config: Record<string, unknown> = SHOP): [string, PeerAiConfig] => {
    const [root, loaded] = shop(config);
    value(createWorkItem(root, loaded, { title: "Orders", kind: "feature", track: "api" }, NOW));
    mkdirSync(join(root, ".peer-ai/reports/SHOP-1"), { recursive: true });
    writeFileSync(join(root, REPORT), typeof content === "string" ? content : json(content));
    return [root, loaded];
  };
  const record = (root: string, config: PeerAiConfig, review: Record<string, unknown>) =>
    recordReview(root, config, "SHOP-1", { skill: "security-review", ...review }, later(1));

  it("works the result out from the report, at the project's blocking level", () => {
    const [root, config] = withReport(report());
    expect(value(record(root, config, { report: REPORT })).reviews).toEqual([
      {
        skill: "security-review",
        result: "pass",
        report: REPORT,
        summary: "One high problem, below the blocking level.",
        at: later(1).toISOString(),
      },
    ]);
    const [strict, strictConfig] = withReport(report({ result: "fail" }), { ...SHOP, gates: { blockOn: "high" } });
    expect(value(record(strict, strictConfig, { report: REPORT })).reviews?.[0]?.result).toBe("fail");
  });

  it("refuses a report that leaves out any of the skill's rules", () => {
    const [root, config] = withReport(report({ coverage: [failing, ...others.slice(3)] }));
    const missing = others.slice(0, 3).map((line) => line.rule);
    expect(error(record(root, config, { report: REPORT }))).toBe(
      `The report leaves out 3 of security-review's rules: ${missing.join(", ")}. Give every rule a coverage line: mark one that doesn't apply as not-applicable, with the reason.`,
    );
  });

  it("refuses a result the report doesn't support", () => {
    const [root, config] = withReport(report());
    expect(error(record(root, config, { report: REPORT, result: "fail" }))).toBe(
      "You gave fail, but the report makes it pass.",
    );
    const [wrong, wrongConfig] = withReport(report(), { ...SHOP, gates: { blockOn: "high" } });
    expect(error(record(wrong, wrongConfig, { report: REPORT }))).toBe(
      "The report says pass, but its findings and coverage make it fail (blocking level: high). Correct the report's result.",
    );
  });

  it("refuses a report for another skill or work item, an invalid one, or one outside the project", () => {
    const [root, config] = withReport(report());
    expect(error(record(root, config, { skill: "code-review", report: REPORT }))).toBe(
      "The report is for security-review, not code-review.",
    );
    const [other, otherConfig] = withReport(report({ workItem: "SHOP-9" }));
    expect(error(record(other, otherConfig, { report: REPORT }))).toBe(
      "The report is for work item SHOP-9, not SHOP-1.",
    );
    const [invalid, invalidConfig] = withReport(report({ coverage: [] }));
    expect(error(record(invalid, invalidConfig, { report: REPORT }))).toMatch(
      /is not a valid review report:\n- coverage/,
    );
    expect(error(record(root, config, { report: "../elsewhere.json" }))).toBe(
      "../elsewhere.json is outside the project. Save the report under .peer-ai/reports/.",
    );
    expect(error(record(root, config, { report: ".peer-ai/reports/none.json" }))).toBe(
      "There is no report at .peer-ai/reports/none.json.",
    );
  });

  it("records a review without a report as unproven, and needs a result for it", () => {
    const [root, config] = shop();
    value(createWorkItem(root, config, { title: "Orders", kind: "feature", track: "api" }, NOW));
    expect(value(record(root, config, { result: "pass", summary: "Looked fine." })).reviews?.[0]).toMatchObject({
      result: "pass",
      summary: "Looked fine.",
      unproven: true,
    });
    expect(error(record(root, config, {}))).toBe("Give the review's result, or the report to work it out from.");
  });
});

describe("verifying work items", () => {
  const passing: CommandRunner = () => Promise.resolve({ code: 0, output: "12 passed" });
  const failing: CommandRunner = () => Promise.resolve({ code: 1, output: "1 failed" });

  it("runs the verify command and records what happened", async () => {
    const [root, config] = shop();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    const failed = value(await runVerify(root, config, "SHOP-1", () => later(1), failing));
    expect(failed).toMatchObject({ command: "npm test", result: "fail", output: "1 failed" });
    expect(failed.item.lastVerify).toEqual({ result: "fail", at: later(1).toISOString() });
    const passed = value(await runVerify(root, config, "SHOP-1", () => later(2), passing));
    expect(passed.item.lastVerify).toEqual({ result: "pass", at: later(2).toISOString() });
  });

  it("says so when there is no verify command to run", async () => {
    const [root, config] = shop({ ...SHOP, commands: {} });
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    expect(error(await runVerify(root, config, "SHOP-1", () => NOW, passing))).toMatch(/^There is no verify command/);
  });

  it("runs a real command through the shell, keeping its exit code and output", async () => {
    const result = await runCommand(`node -e "console.log('checked'); process.exit(3)"`, project());
    expect(result).toEqual({ code: 3, output: "checked\n" });
  });

  it("gives a command that waits for input the end of it, instead of hanging", async () => {
    const result = await runCommand(
      `node -e "process.stdin.resume().on('end', () => console.log('no input'))"`,
      project(),
    );
    expect(result).toEqual({ code: 0, output: "no input\n" });
  });
});

describe("next work", () => {
  it("returns the work item for the current branch, and every open item", () => {
    const [root, config] = shop(SHOP, { git: true });
    execFileSync("git", ["symbolic-ref", "HEAD", "refs/heads/feature/SHOP-2-totals"], { cwd: root });
    expect(currentBranch(root)).toBe("feature/SHOP-2-totals");
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    value(createWorkItem(root, config, { title: "Totals", kind: "bug", track: "web" }, later(1)));
    value(createWorkItem(root, config, { title: "Old", kind: "chore", track: "web" }, later(2)));
    value(advanceWorkItem(root, config, "SHOP-3", "cancelled", later(3)));
    const next = nextWork(root, config);
    expect(next.branch).toBe("feature/SHOP-2-totals");
    expect(next.current?.id).toBe("SHOP-2");
    expect(next.open.map((item) => item.id)).toEqual(["SHOP-2", "SHOP-1"]);
    expect(next.gaps).toBeUndefined();
  });

  it("offers the stage's gaps when nothing is open, with the skill that fills each", () => {
    const [root, config] = shop();
    const needed = ["requirements", "api-contract", "ci", "tests", "threat-model", "docs"];
    const later = [
      "architecture",
      "specs",
      "data-model",
      "design",
      "standards",
      "environments",
      "infrastructure",
      "observability",
      "slos",
      "runbooks",
      "load-testing",
    ];
    // The first skill written so far for each gap; routing.test.ts covers the choice itself.
    const useSkill = Object.fromEntries(
      [...needed, ...later].flatMap((item) => {
        const skill = MAP_ITEM_SKILLS[item as KnownMapItemId]?.find((id) => availableSkills().includes(id));
        return skill === undefined ? [] : [[item, renderedName(skill)]];
      }),
    );
    expect(useSkill).toMatchObject({ requirements: "peer-ai-requirements-analysis" });
    // Setup problems are covered in doctor.test.ts; this bare project has some.
    expect({ ...nextWork(root, config), setup: undefined }).toEqual({
      open: [],
      gaps: { stage: "mvp", needed, later, useSkill },
    });
  });
});
