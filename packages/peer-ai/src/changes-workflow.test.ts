import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigSchema, type PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { CHANGES_FILE, changesWorkflow } from "./changes-workflow.ts";
import { runRender } from "./render.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const shop = (tracks: unknown[]): PeerAiConfig => ConfigSchema.parse({ version: 1, project: { name: "Shop" }, tracks });

/** A web app and an API that both use a shared library, and the infrastructure beside them. */
const SHOP = shop([
  { id: "web", kind: "web", path: "apps/web", status: "active", uses: ["shared"] },
  { id: "api", kind: "backend", path: "./apps/api/", status: "active", uses: ["shared"] },
  { id: "shared", kind: "library", path: "packages/shared", status: "active" },
  { id: "infra", kind: "infrastructure", path: "infra", status: "active" },
  { id: "billing", kind: "backend", status: "external", repo: "example/billing" },
  { id: "kiosk", kind: "web", path: "apps/kiosk", status: "retired" },
]);

/** The step's shell script, as the run block holds it. */
function script(workflow: string): string {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line === "        run: |") + 1;
  return lines
    .slice(start)
    .filter((line) => line.startsWith("          "))
    .map((line) => line.slice(10))
    .join("\n");
}

/**
 * Runs the script with gh standing in for GitHub: it answers the compare API from the files given,
 * through the real jq, as gh's --jq does, or fails when `files` is "fail". Returns the outputs.
 */
function run(
  config: PeerAiConfig,
  files: { filename: string; previous_filename?: string }[] | "fail" | "none",
  base = "a".repeat(40),
) {
  const dir = mkdtempSync(join(tmpdir(), "peer-ai-changes-"));
  const output = join(dir, "output");
  const calls = join(dir, "calls");
  writeFileSync(output, "");
  writeFileSync(join(dir, "compare.json"), JSON.stringify(files === "none" ? {} : { files }));
  const gh = join(dir, "gh");
  writeFileSync(
    gh,
    `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${calls}"\n${files === "fail" ? "exit 1" : `jq -r "$4" "${join(dir, "compare.json")}"`}\n`,
  );
  chmodSync(gh, 0o755);
  const result = spawnSync(
    "bash",
    ["--noprofile", "--norc", "-eo", "pipefail", "-c", script(changesWorkflow(config) ?? "")],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH ?? ""}`,
        GITHUB_OUTPUT: output,
        GITHUB_REPOSITORY: "example/shop",
        BASE: base,
        HEAD_SHA: "b".repeat(40),
      },
    },
  );
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  const outputs = Object.fromEntries(
    readFileSync(output, "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split("=")),
  ) as Record<string, string>;
  return { outputs, stdout: result.stdout, calls: existsSync(calls) ? readFileSync(calls, "utf8") : "" };
}

const changed = (...names: string[]) => names.map((filename) => ({ filename }));
/** Whether shellcheck is installed, as it is on GitHub's Ubuntu runners. */
const shellcheck = spawnSync("shellcheck", ["--version"]).status === 0;
const on = (outputs: Record<string, string>) =>
  Object.entries(outputs)
    .filter(([, value]) => value === "true")
    .map(([name]) => name)
    .sort();

describe.skipIf(process.platform === "win32")("what changed (RFC 0022)", () => {
  it("says which parts a change touched, a part changing with what it uses", () => {
    const { outputs, calls } = run(SHOP, changed("apps/web/src/Cart.tsx", "apps/web/package.json"));
    expect(outputs).toEqual({
      code: "true",
      other: "false",
      web: "true",
      api: "false",
      shared: "false",
      infra: "false",
    });
    expect(calls).toContain(`api repos/example/shop/compare/${"a".repeat(40)}...${"b".repeat(40)} --jq`);
    expect(on(run(SHOP, changed("packages/shared/money.ts")).outputs)).toEqual(["api", "code", "shared", "web"]);
    expect(on(run(SHOP, changed("infra/main.tf", "README.md")).outputs)).toEqual(["code", "infra", "other"]);
  });

  it("counts Peer AI's lint settings as code, and gives a retired part no output (#275, #276)", () => {
    const { outputs } = run(SHOP, changed(".peer-ai/enforce/ruff.toml"));
    expect(on(outputs)).toEqual(["code", "other"]);
    expect(outputs).not.toHaveProperty("kiosk");
    // A file still in a retired part's folder belongs to no part.
    expect(on(run(SHOP, changed("apps/kiosk/index.html")).outputs)).toEqual(["code", "other"]);
  });

  it.runIf(shellcheck)("passes shellcheck, as actionlint runs it (#273)", () => {
    // A part named like an output every project has gets no output of its own, nor a variable.
    const named = shop([
      { id: "web", kind: "web", path: "apps/web", status: "active" },
      { id: "other", kind: "other", path: "tools", status: "active" },
    ]);
    for (const config of [SHOP, named]) {
      const dir = mkdtempSync(join(tmpdir(), "peer-ai-shellcheck-"));
      writeFileSync(join(dir, "step.sh"), `#!/usr/bin/env bash\n${script(changesWorkflow(config) ?? "")}\n`);
      const result = spawnSync("shellcheck", ["--shell=bash", join(dir, "step.sh")], { encoding: "utf8" });
      expect(result.stdout).toBe("");
      expect(result.status).toBe(0);
    }
  });

  it("counts a file moved between parts for both, and nothing for Peer AI's own records", () => {
    const moved = run(SHOP, [{ filename: "apps/web/src/total.ts", previous_filename: "apps/api/src/total.ts" }]);
    expect(on(moved.outputs)).toEqual(["api", "code", "web"]);
    expect(on(run(SHOP, changed(".peer-ai/work/SHOP-1.json", ".peer-ai/history.jsonl")).outputs)).toEqual([]);
    expect(on(run(SHOP, []).outputs)).toEqual([]);
  });

  it("gives a file to the part that holds it most closely, and the rest to a part at the root", () => {
    const nested = shop([
      { id: "site", kind: "web", path: ".", status: "active" },
      { id: "docs", kind: "web", path: "site/docs", status: "active" },
    ]);
    expect(on(run(nested, changed("site/docs/intro.md")).outputs)).toEqual(["code", "docs"]);
    expect(on(run(nested, changed("site/index.html", "package.json")).outputs)).toEqual(["code", "site"]);
  });

  it("says everything changed when it can't tell", () => {
    const every = ["api", "code", "infra", "other", "shared", "web"];
    const first = run(SHOP, changed("apps/web/a.ts"), "0".repeat(40));
    expect(on(first.outputs)).toEqual(every);
    expect(first.calls).toBe("");
    expect(first.stdout).toContain("Can't tell what changed, so every part counts as changed.");
    expect(on(run(SHOP, changed("apps/web/a.ts"), "").outputs)).toEqual(every);
    expect(on(run(SHOP, "fail").outputs)).toEqual(every);
    expect(on(run(SHOP, "none").outputs)).toEqual(every);
    // GitHub lists 300 files at most, so at 300 there may be more it didn't list.
    const many = Array.from({ length: 300 }, (_, i) => ({ filename: `apps/web/${String(i)}.ts` }));
    expect(on(run(SHOP, many).outputs)).toEqual(every);
  });

  it("is written by render on GitHub Actions for a project of several parts, and only then", () => {
    const config = (tracks: unknown[]) => JSON.stringify({ version: 1, project: { name: "Shop" }, tracks });
    const two = [
      { id: "web", kind: "web", path: "apps/web", status: "active" },
      { id: "api", kind: "backend", path: "apps/api", status: "active" },
    ];
    const root = project({ "peer-ai.config.json": config(two), ".github/workflows/ci.yml": "on: push\n" });
    const out = capture();
    runRender({ cwd: root, check: false }, out);
    const written = readFileSync(join(root, CHANGES_FILE), "utf8");
    expect(written).toContain("  workflow_call:\n");
    expect(written).toContain('      web:\n        description: "true when apps/web/ changed"\n');
    expect(written).toContain(
      "#       if: needs.changes.outputs.web == 'true' || needs.changes.outputs.other == 'true'",
    );
    expect(written).toContain("    permissions:\n      contents: read\n");
    expect(written).not.toContain("uses: actions/");
    expect(out.text()).toContain("Nothing runs it until a workflow of yours calls it first");

    const one = project({ "peer-ai.config.json": config([two[0]]), ".github/workflows/ci.yml": "on: push\n" });
    runRender({ cwd: one, check: false, quiet: true }, capture());
    expect(existsSync(join(one, CHANGES_FILE))).toBe(false);
    const elsewhere = project({
      "peer-ai.config.json": config(two),
      ".gitlab-ci.yml": "test:\n  script: [npm test]\n",
    });
    runRender({ cwd: elsewhere, check: false, quiet: true }, capture());
    expect(existsSync(join(elsewhere, CHANGES_FILE))).toBe(false);
  });

  it("leaves out a part named like an output every project has, and says so", () => {
    const config = JSON.stringify({
      version: 1,
      project: { name: "Shop" },
      tracks: [
        { id: "web", kind: "web", path: "apps/web", status: "active" },
        { id: "other", kind: "other", path: "tools", status: "active" },
      ],
    });
    const root = project({ "peer-ai.config.json": config, ".github/workflows/ci.yml": "on: push\n" });
    const out = capture();
    runRender({ cwd: root, check: false }, out);
    expect(out.text()).toContain("other has no output of its own");
    const written = readFileSync(join(root, CHANGES_FILE), "utf8");
    expect(written.match(/^ {6}other:$/gm)).toHaveLength(1);
  });
});
