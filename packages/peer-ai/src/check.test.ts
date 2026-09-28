import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, runAssess } from "./assess.ts";
import { evaluate, runCheck, type Verdict } from "./check.ts";
import type { Check } from "./checks.ts";
import { main } from "./cli.ts";
import { formatReport } from "./report.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");
const json = (value: unknown) => JSON.stringify(value);
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
const REPORT = ".peer-ai/reports/SHOP-1/code-review.json";

const config = (extra: Record<string, unknown> = {}, stage = "mvp") =>
  json({
    version: 1,
    project: { name: "Shop", stage },
    tools: ["claude-code"],
    tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
    commands: { verify: "npm test" },
    ...extra,
  });

/** An assessed project with a map on disk, so only what a test changes can fail. */
function shop(extra: Record<string, unknown> = {}, stage = "mvp", files: Record<string, string> = {}): string {
  const root = project({
    "peer-ai.config.json": config(extra, stage),
    "apps/web/package.json": json({ dependencies: { react: "19.0.0" } }),
    ...files,
  });
  runAssess({ cwd: root, json: false, dryRun: false, now: NOW }, capture(), formatReport);
  return root;
}

const item = (id: string, fields: Record<string, unknown> = {}) => ({
  version: 1,
  id,
  title: "Checkout",
  kind: "feature",
  stage: "done",
  track: "web",
  lastVerify: { result: "pass", at: at(0) },
  next: "Nothing; shipped",
  updatedAt: at(0),
  ...fields,
});

function addWorkItems(root: string, ...items: ({ id: string } & Record<string, unknown>)[]): void {
  mkdirSync(join(root, ".peer-ai/work"), { recursive: true });
  for (const workItem of items) writeFileSync(join(root, ".peer-ai/work", `${workItem.id}.json`), json(workItem));
}

function verdict(root: string): Verdict {
  const { config: loaded } = loadConfig(root);
  if (loaded === undefined) throw new Error("the test project has no valid config");
  return evaluate(root, loaded);
}

const failures = (root: string): string[] =>
  verdict(root)
    .checks.filter((check) => check.status === "fail")
    .map((check) => check.message);
const find = (root: string, id: string): Check[] => verdict(root).checks.filter((check) => check.id === id);

describe("check on work items", () => {
  it("passes done work that was verified and reviewed", () => {
    const root = shop();
    addWorkItems(
      root,
      item("SHOP-1", { reviews: [{ skill: "code-review", result: "pass", report: REPORT, at: at(1) }] }),
    );
    const result = verdict(root);
    expect(result.ok).toBe(true);
    expect(find(root, "gates")).toEqual([
      { id: "gates", status: "ok", message: "1 work item at ship or done, each verified and reviewed" },
    ]);
  });

  it("fails work at ship or done without a passing verify, but not work still being built", () => {
    const root = shop();
    addWorkItems(
      root,
      item("SHOP-1", { lastVerify: undefined }),
      item("SHOP-2", { stage: "ship", lastVerify: { result: "fail", at: at(0) } }),
      item("SHOP-3", { stage: "build", lastVerify: undefined }),
    );
    expect(failures(root)).toEqual([
      "SHOP-1 is at done, but it has no recorded verify.",
      "SHOP-2 is at ship, but its last verify failed.",
    ]);
  });

  it("doesn't ask for a verify when the project has no verify command yet", () => {
    const root = shop({ commands: { verify: null } });
    addWorkItems(root, item("SHOP-1", { lastVerify: undefined }));
    expect(failures(root)).toEqual([]);
  });

  it("judges each skill by its latest review", () => {
    const root = shop();
    addWorkItems(
      root,
      item("SHOP-1", {
        reviews: [
          { skill: "code-review", result: "fail", at: at(1) },
          { skill: "code-review", result: "pass", at: at(2) },
          { skill: "security-review", result: "pass", at: at(1) },
          { skill: "security-review", result: "fail", at: at(3) },
          { skill: "accessibility-review", result: "incomplete", at: at(1) },
        ],
      }),
    );
    expect(failures(root)).toEqual([
      "SHOP-1 is at done, but its latest security-review failed.",
      "SHOP-1 is at done, but its latest accessibility-review is incomplete: it didn't check every rule.",
    ]);
  });

  it("accepts an incomplete review at the prototype stage, but never a failed one", () => {
    const root = shop({}, "prototype");
    addWorkItems(
      root,
      item("SHOP-1", { reviews: [{ skill: "accessibility-review", result: "incomplete", at: at(1) }] }),
      item("SHOP-2", { reviews: [{ skill: "code-review", result: "fail", at: at(1) }] }),
    );
    expect(failures(root)).toEqual(["SHOP-2 is at done, but its latest code-review failed."]);
  });

  it("treats a review with no report as unproven: fine for a prototype, a warning for an MVP, a failure in production", () => {
    const unproven = item("SHOP-1", { reviews: [{ skill: "code-review", result: "pass", at: at(1) }] });
    const message = "SHOP-1 is at done, but its latest code-review has no report, so its result is unproven.";
    const byStage = (stage: string) => {
      const root = shop({}, stage);
      addWorkItems(root, unproven);
      return find(root, "gates")
        .filter((check) => check.message === message)
        .map((check) => check.status);
    };
    expect(byStage("prototype")).toEqual([]);
    expect(byStage("mvp")).toEqual(["warn"]);
    expect(byStage("production")).toEqual(["fail"]);
  });

  it("fails a gap marked done that a fresh assessment still finds", () => {
    const root = shop();
    addWorkItems(root, item("SHOP-1", { kind: "gap", gap: "threat-model" }));
    expect(failures(root)).toEqual([
      "SHOP-1 says the threat-model gap is done, but a fresh assessment finds it missing.",
    ]);
    writeFileSync(join(root, "threat-model.md"), "# Threat model");
    runAssess({ cwd: root, json: false, dryRun: false, now: NOW }, capture(), formatReport);
    expect(failures(root)).toEqual([]);
  });

  it("fails an invalid work item, and one on a track the config doesn't have", () => {
    const root = shop();
    addWorkItems(root, item("SHOP-1", { track: "mobile" }), { id: "SHOP-2", title: "No stage" });
    expect(failures(root)).toEqual([
      '.peer-ai/work/SHOP-1.json is for the track "mobile", which isn\'t in the config.',
      expect.stringMatching(/^\.peer-ai\/work\/SHOP-2\.json is not valid: /) as string,
    ]);
  });
});

describe("check on the project", () => {
  it("reports gaps for the stage as warnings, and counts the ones with a work item", () => {
    const root = shop({}, "mvp", { "README.md": "# Shop", "docs/guide.md": "" });
    const [before] = find(root, "gaps");
    expect(before).toMatchObject({ status: "warn" });
    expect(before?.message).toBe("4 gaps for mvp with no work item: requirements, ci, tests, threat-model.");

    addWorkItems(
      root,
      ...["requirements", "ci", "tests", "threat-model"].map((gap, i) =>
        item(`GAP-${String(i + 1)}`, { kind: "gap", gap, stage: "build", lastVerify: undefined }),
      ),
    );
    expect(find(root, "gaps")).toEqual([
      { id: "gaps", status: "ok", message: "4 gaps for mvp, each with a work item" },
    ]);
  });

  it("asks nothing of a prototype's map, and warns when an mvp has no verify command", () => {
    expect(find(shop({}, "prototype"), "gaps")[0]?.status).toBe("ok");
    expect(find(shop({ commands: {} }), "verify")).toMatchObject([{ status: "warn" }]);
    expect(find(shop({ commands: {} }, "prototype"), "verify")).toEqual([]);
  });

  it("warns when the map is out of date, and fails when it is broken or a track's folder is gone", () => {
    const root = shop();
    writeFileSync(join(root, "apps/web/cart.test.ts"), "");
    expect(find(root, "map")).toMatchObject([
      { status: "warn", message: "The project map is out of date: tests (missing → present)." },
    ]);
    writeFileSync(join(root, ".peer-ai/map.json"), "{}");
    const broken = shop({
      tracks: [
        { id: "web", kind: "web", path: "apps/web", status: "active" },
        { id: "api", kind: "backend", path: "services/api", status: "active" },
      ],
    });
    expect(failures(root)).toEqual([expect.stringMatching(/^\.peer-ai\/map\.json is not valid: /) as string]);
    expect(failures(broken)).toEqual(['Track "api" points to services/api, which doesn\'t exist.']);
  });

  it("exits 0 with warnings, 1 on a failure and 2 without a valid config", async () => {
    const root = shop();
    const out = capture();
    expect(runCheck({ cwd: root, json: false }, out)).toBe(0);
    expect(out.text()).toContain("Peer AI check: Shop (stage: mvp)");
    expect(out.text()).toMatch(/Passed, with \d+ warnings?\./);

    addWorkItems(root, item("SHOP-1", { lastVerify: undefined }));
    const failed = capture();
    expect(await main(["check"], { cwd: root, out: failed })).toBe(1);
    expect(failed.text()).toMatch(/Failed: 1 problem, and \d+ warnings?\./);

    const printed = capture();
    runCheck({ cwd: root, json: true }, printed);
    expect(JSON.parse(printed.text())).toMatchObject({ name: "Shop", stage: "mvp", ok: false });

    const none = capture();
    expect(runCheck({ cwd: project(), json: false }, none)).toBe(2);
    expect(none.text()).toBe("There is no peer-ai.config.json. Run peer-ai init first.");
    const invalid = capture();
    expect(runCheck({ cwd: project({ "peer-ai.config.json": "{}" }), json: false }, invalid)).toBe(2);
    expect(invalid.text()).toContain("peer-ai.config.json is not valid:");
  });
});
