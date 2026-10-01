import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { diagnose } from "./doctor.ts";
import { GATE_FILE, checkGate, gateCommand, gateWorkflow, planGate } from "./gate.ts";
import { VERSION } from "./package-info.ts";
import { planRender, runRender } from "./render.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const NODE = "24.3.0";
const config = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    project: { name: "Pantry", stage: "mvp" },
    tools: ["claude-code"],
    tracks: [{ id: "api", kind: "backend", status: "active" }],
    ...extra,
  });
const CI = "name: CI\non: pull_request\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pytest\n";

function loaded(root: string) {
  const { config: value } = loadConfig(root);
  if (value === undefined) throw new Error("the test config is not valid");
  return value;
}

const gateChecks = (root: string) => diagnose(root, NODE).checks.filter((check) => check.id === "gate");
const read = (root: string, path: string) => readFileSync(join(root, path), "utf8");

describe("the CI gate", () => {
  it("is written as a workflow of its own on GitHub Actions, with Node 24 and the exact version", () => {
    const root = project({ "peer-ai.config.json": config(), ".github/workflows/ci.yml": CI });
    expect(gateChecks(root)).toEqual([
      {
        id: "gate",
        status: "warn",
        message: "No CI runs peer-ai check, so nothing holds work to its record in CI.",
        fix: `Run npx peer-ai render. It writes ${GATE_FILE}.`,
      },
    ]);
    expect(runRender({ cwd: root, check: false }, capture())).toBe(0);
    const gate = read(root, GATE_FILE);
    expect(gate).toContain("name: peer-ai check");
    expect(gate).toContain("node-version: 24");
    expect(gate).toContain(`- run: npx -y peer-ai@${VERSION} check`);
    expect(gate).toContain("actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0");
    expect(gate).toMatch(/^# peer-ai sha256: [0-9a-f]{16}$/m);
    expect(gate).not.toContain("push:");
    expect(gateChecks(root)).toEqual([{ id: "gate", status: "ok", message: `CI runs peer-ai check: ${GATE_FILE}` }]);
    expect(diagnose(root, NODE).checks.find((check) => check.id === "render")?.status).toBe("ok");
    expect(gateCommand()).toBe(`npx -y peer-ai@${VERSION} check`);
  });

  it("checks pushes to the default branch when the config names one, and keeps up with the config", () => {
    const root = project({
      "peer-ai.config.json": config({ repo: { defaultBranch: "main" } }),
      ".github/workflows/ci.yml": CI,
    });
    expect(gateWorkflow(loaded(root))).toContain("  push:\n    branches: [main]");
    runRender({ cwd: root, check: false }, capture());
    writeFileSync(join(root, "peer-ai.config.json"), config({ repo: { defaultBranch: "trunk" } }));
    expect(planGate(root, loaded(root)).planned?.action).toBe("update");
    expect(gateChecks(root)[0]).toMatchObject({ status: "warn", message: `${GATE_FILE} is out of date.` });
    runRender({ cwd: root, check: false }, capture());
    expect(read(root, GATE_FILE)).toContain("branches: [trunk]");
  });

  it("is never added twice: a workflow that runs it already is enough", () => {
    const root = project({
      "peer-ai.config.json": config(),
      ".github/workflows/ci.yml": `${CI}      - run: npx peer-ai check\n`,
    });
    expect(planGate(root, loaded(root))).toEqual({ runsIn: ".github/workflows/ci.yml" });
    runRender({ cwd: root, check: false }, capture());
    expect(() => read(root, GATE_FILE)).toThrow();
    expect(gateChecks(root)).toEqual([
      { id: "gate", status: "ok", message: "CI runs peer-ai check: .github/workflows/ci.yml" },
    ]);
  });

  it("is left alone once changed by hand, and doctor still checks it runs", () => {
    const root = project({ "peer-ai.config.json": config(), ".github/workflows/ci.yml": CI });
    runRender({ cwd: root, check: false }, capture());
    const edited = read(root, GATE_FILE).replace("timeout-minutes: 10", "timeout-minutes: 15");
    writeFileSync(join(root, GATE_FILE), edited);
    expect(planGate(root, loaded(root)).planned?.action).toBe("kept");
    runRender({ cwd: root, check: false }, capture());
    expect(read(root, GATE_FILE)).toBe(edited);
    expect(gateChecks(root)[0]?.status).toBe("ok");

    writeFileSync(join(root, GATE_FILE), edited.replace(/ {6}- run: npx.*\n/, ""));
    expect(gateChecks(root)).toEqual([
      {
        id: "gate",
        status: "warn",
        message: `${GATE_FILE} was changed by hand, and no longer runs peer-ai check.`,
        fix: `Put the step back: - run: npx -y peer-ai@${VERSION} check`,
      },
    ]);
  });

  it("gives the step to add for any other CI, and sees it once it's there", () => {
    const root = project({ "peer-ai.config.json": config(), ".gitlab-ci.yml": "test:\n  script: pytest\n" });
    const step = `Your CI, .gitlab-ci.yml, doesn't run Peer AI's gate. Add a step that runs, with Node 24, after the project's own checks: npx -y peer-ai@${VERSION} check`;
    expect(planRender(root, loaded(root)).manual).toContain(step);
    expect(gateChecks(root)).toEqual([
      {
        id: "gate",
        status: "warn",
        message: "No CI runs peer-ai check, so nothing holds work to its record in CI.",
        fix: step,
      },
    ]);
    writeFileSync(join(root, ".gitlab-ci.yml"), "test:\n  script: pytest\ngate:\n  script: npx -y peer-ai check\n");
    expect(gateChecks(root)[0]?.status).toBe("ok");
  });

  it("does nothing without CI, for Peer AI's own workflows alone, or when the config turns it off", () => {
    const none = project({ "peer-ai.config.json": config() });
    expect(planGate(none, loaded(none))).toEqual({});
    expect(checkGate(none, loaded(none))).toEqual([]);

    const copilotOnly = project({
      "peer-ai.config.json": config({ tools: ["copilot"] }),
      ".github/workflows/copilot-setup-steps.yml": "name: Copilot setup steps\n",
    });
    expect(planGate(copilotOnly, loaded(copilotOnly))).toEqual({});

    const off = project({
      "peer-ai.config.json": config({ delivery: { ci: "existing", pipeline: ".github/workflows/", gate: false } }),
      ".github/workflows/ci.yml": CI,
    });
    expect(planGate(off, loaded(off))).toEqual({});
    runRender({ cwd: off, check: false }, capture());
    expect(() => read(off, GATE_FILE)).toThrow();
    expect(gateChecks(off)).toEqual([
      { id: "gate", status: "skip", message: "The CI gate is off: delivery.gate is false." },
    ]);
  });
});
