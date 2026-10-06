import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { adoptionOf, type PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { checkEnforcers } from "./enforcers.ts";
import { workflowFile, workflowJobs, workflowSummary } from "./pipeline.ts";
import { planRender } from "./render.ts";
import { ruffFile } from "./ruff.ts";
import { ENFORCING, enforcementFor, type Enforcement } from "./stages.ts";
import { cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const TODAY = new Date("2026-10-02T09:00:00Z");

const repairs = (standards: Record<string, unknown> = {}, extra: Partial<PeerAiConfig> = {}): PeerAiConfig => ({
  version: 1,
  project: { name: "Repairs", stage: "mvp" },
  tracks: [
    { id: "api", kind: "backend", path: "services/api", status: "active", stack: ["python", "fastapi"] },
    { id: "app", kind: "web", status: "active" },
  ],
  repo: { host: "github", defaultBranch: "main" },
  standards: { profiles: ["github-actions", "python"], ...standards },
  ...extra,
});

const enforcement = (config: PeerAiConfig, runByProject: Record<string, string> = {}): Enforcement => ({
  adoption: adoptionOf(config, TODAY, () => undefined),
  runByProject: new Map(Object.entries(runByProject)),
});

/** Each job of a workflow, and whether it only reports. */
const reporting = (file: string | undefined): Record<string, boolean> => {
  const text = file ?? "";
  return Object.fromEntries(
    text
      .slice(text.indexOf("\njobs:\n") + "\njobs:\n".length)
      .split(/\n(?= {2}[a-z-]+:\n)/)
      .map((block): [string, boolean] => [
        /^ {2}([a-z-]+):/.exec(block)?.[1] ?? "",
        block.includes("continue-on-error: true"),
      ]),
  );
};

describe("the security workflow, in stages (RFC 0011)", () => {
  it("blocks by default, and only reports in the report stage, saying so in its header", () => {
    expect(Object.values(reporting(workflowFile(repairs(), ENFORCING)))).not.toContain(true);
    const config = repairs({ enforcement: "report" });
    const file = workflowFile(config, enforcement(config)) ?? "";
    expect(new Set(Object.values(reporting(file)))).toEqual(new Set([true]));
    expect(file).toContain("A job whose check has continue-on-error only reports for now");
    // On the step, not the job, so the job finishes green on a pull request (#153), and says what it found.
    expect(file).not.toMatch(/^ {4}continue-on-error/m);
    expect(file).toContain("        continue-on-error: true");
    expect(file).toContain("        if: steps.check.outcome == 'failure'");
    expect(file).toContain('echo "::warning title=peer-ai / code::GHA-05 found problems. Reporting only for now');
    expect(file).toContain('>> "$GITHUB_STEP_SUMMARY"');
  });

  it("only reports the job of a deferred rule", () => {
    const config = repairs({
      deferred: [{ rule: "GHA-05", until: "2026-11-02", reason: "After the launch.", decidedBy: "Ada Obi" }],
    });
    expect(reporting(workflowFile(config, enforcement(config)))).toMatchObject({
      secrets: false,
      dependencies: false,
      workflows: false,
      code: true,
    });
  });

  it("leaves out a job the project's own workflow runs, or a rule it covers, and says so", () => {
    const config = repairs({
      coveredBy: [{ rule: "GHA-02", by: ".github/workflows/ci.yml", reason: "Trivy scans the dependencies." }],
    });
    const own = enforcement(config, { secrets: ".github/workflows/ci.yml, which runs gitleaks" });
    expect(workflowJobs(config, own)).toEqual(["workflows", "code"]);
    expect(workflowSummary(config, own)).toBe(
      "It runs workflows (GHA-03, GHA-04); code (GHA-05). secrets is covered by .github/workflows/ci.yml, which runs gitleaks; GHA-02 is covered by .github/workflows/ci.yml.",
    );
  });
});

describe("Ruff's settings, in stages (RFC 0011)", () => {
  it("leave out a rule that only reports, since Ruff has no warnings, and explain the file", () => {
    const config = repairs({ enforcement: "report" });
    const file = ruffFile(config, enforcement(config)) ?? "";
    expect(file).toContain("# No rules enforce yet.");
    expect(file).toContain("# Reporting only for now, so left out until they enforce: PY-");
    expect(file).toMatch(/extend-select = \[\s*\]/);
    expect(file).toContain("Ruff reads it only when your own Ruff settings extend it");
    expect(ruffFile(repairs(), ENFORCING)).not.toContain("Reporting only for now");
  });
});

describe("where a project stands (RFC 0011)", () => {
  const files = (config: Record<string, unknown>, more: Record<string, string> = {}) =>
    project({ "peer-ai.config.json": JSON.stringify(config), "services/api/requirements.txt": "fastapi\n", ...more });
  const base = {
    version: 1,
    project: { name: "Repairs", stage: "production", origin: "existing" },
    tracks: [{ id: "api", kind: "backend", path: "services/api", status: "active", stack: ["python", "fastapi"] }],
    standards: { profiles: ["github-actions", "python"] },
  };

  it("finds a tool the project's own workflow runs, but not in Peer AI's own or in a comment", () => {
    const root = files(base, {
      ".github/workflows/ci.yml":
        "jobs:\n  secrets:\n    steps:\n      - run: gitleaks detect\n      # - run: semgrep scan\n",
      ".github/workflows/peer-ai-security.yml": "jobs:\n  code:\n    steps:\n      - run: semgrep scan\n",
    });
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    expect([...enforcementFor(root, config, TODAY).runByProject]).toEqual([
      ["secrets", ".github/workflows/ci.yml, which runs gitleaks"],
    ]);
  });

  it("ends a deferral when its work item is done", () => {
    const deferred = {
      ...base,
      standards: {
        ...base.standards,
        deferred: [{ rule: "GHA-02", untilItem: "RP-4", reason: "Fix the advisories first.", decidedBy: "Ada Obi" }],
      },
    };
    const root = files(deferred);
    mkdirSync(join(root, ".peer-ai/work"), { recursive: true });
    const item = (stage: string) =>
      JSON.stringify({
        version: 1,
        id: "RP-4",
        title: "Advisories",
        kind: "chore",
        stage,
        next: "Fix them",
        updatedAt: TODAY.toISOString(),
      });
    writeFileSync(join(root, ".peer-ai/work/RP-4.json"), item("build"));
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    expect([...enforcementFor(root, config, TODAY).adoption.deferred.keys()]).toEqual(["GHA-02"]);
    writeFileSync(join(root, ".peer-ai/work/RP-4.json"), item("done"));
    expect(enforcementFor(root, config, TODAY).adoption.ended.map((deferral) => deferral.rule)).toEqual(["GHA-02"]);
  });

  it("is what doctor reports: no failure while reporting, each deferral, and what's covered", () => {
    const enforcing = files(base);
    const { config: strict } = loadConfig(enforcing);
    if (strict === undefined) throw new Error("the test config is not valid");
    const checks = checkEnforcers(enforcing, strict, TODAY);
    expect(checks.some((check) => check.status === "fail")).toBe(true);
    expect(checks).toContainEqual(
      expect.objectContaining({
        status: "warn",
        message: "This is an existing codebase, and Peer AI's enforcement fails builds from the start.",
      }),
    );

    const staged = files(
      {
        ...base,
        standards: {
          ...base.standards,
          enforcement: "report",
          deferred: [
            { rule: "GHA-03", until: "2026-10-05", reason: "After the demo.", decidedBy: "Ada Obi" },
            { rule: "GHA-05", until: "2026-10-01", reason: "Was for last week.", decidedBy: "Ada Obi" },
          ],
          coveredBy: [{ rule: "GHA-02", by: ".github/workflows/ci.yml", reason: "Trivy scans them." }],
        },
      },
      { ".github/workflows/ci.yml": "jobs:\n  scan:\n    steps:\n      - run: trivy fs .\n" },
    );
    const { config } = loadConfig(staged);
    if (config === undefined) throw new Error("the test config is not valid");
    const reported = checkEnforcers(staged, config, TODAY);
    expect(reported.filter((check) => check.status === "fail")).toEqual([]);
    expect(reported).toContainEqual({
      id: "enforcers",
      status: "skip",
      message:
        'Enforcement reports only (standards.enforcement is report), so nothing Peer AI\'s tools find fails a build: its 12 Ruff rules are left out of .peer-ai/enforce/ruff.toml, since Ruff has no warnings; the security workflow\'s 5 checks report without failing. To make some block while the rest keep reporting, set "enforcement": "enforce", and list the rules that aren\'t ready in standards.deferred, each with a reason, who decided, and the work item that ends it (untilItem).',
    });
    expect(reported).toContainEqual(
      expect.objectContaining({
        status: "warn",
        message: "GHA-03 only reports until 2026-10-05: After the demo. (decided by Ada Obi)",
      }),
    );
    expect(reported).toContainEqual(
      expect.objectContaining({
        status: "warn",
        message: "GHA-05's deferral has ended (2026-10-01), so its enforcement blocks again.",
      }),
    );
    expect(reported).toContainEqual({
      id: "enforcers",
      status: "ok",
      message: "GHA-02 is covered by .github/workflows/ci.yml: Trivy scans them.",
    });
  });

  it("is what render says about the security workflow it writes", () => {
    const root = files(
      { ...base, standards: { ...base.standards, enforcement: "report" } },
      { ".github/workflows/ci.yml": "jobs:\n  secrets:\n    steps:\n      - run: gitleaks detect\n" },
    );
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    const security = planRender(root, config).files.find(
      (file) => file.path === ".github/workflows/peer-ai-security.yml",
    );
    expect(security).toMatchObject({ action: "create" });
    expect(security?.note).toContain("reporting only");
    expect(security?.note).toContain("secrets is covered by .github/workflows/ci.yml, which runs gitleaks");
  });
});
