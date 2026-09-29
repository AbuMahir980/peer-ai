import { existsSync } from "node:fs";
import { join } from "node:path";
import { skillRuleIds } from "@peer-ai/skills";
import { afterEach, describe, expect, it } from "vitest";
import { main } from "./cli.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

async function run(argv: string[], cwd = project()) {
  const out = capture();
  const code = await main(argv, { cwd, out });
  return { code, text: out.text(), cwd };
}

describe("the peer-ai command", () => {
  it("prints help with no arguments or with --help", async () => {
    for (const argv of [[], ["--help"], ["-h"]]) {
      const { code, text } = await run(argv);
      expect(code).toBe(0);
      expect(text).toContain("peer-ai init");
    }
  });

  it("prints its version", async () => {
    const { code, text } = await run(["--version"]);
    expect(code).toBe(0);
    expect(text).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("rejects an unknown command", async () => {
    const { code, text } = await run(["deploy"]);
    expect(code).toBe(2);
    expect(text).toContain('Unknown command "deploy"');
  });

  it("rejects an unknown flag and a bad value", async () => {
    expect((await run(["init", "--yess"])).code).toBe(2);
    const { code, text } = await run(["init", "--yes", "--stage", "beta"]);
    expect(code).toBe(2);
    expect(text).toContain("--stage must be one of: prototype, mvp, production");
  });

  it("runs init with flags", async () => {
    const { code, cwd } = await run(["init", "-y", "--name", "Demo", "--tool", "codex", "--tool", "cursor"]);
    expect(code).toBe(0);
    expect(existsSync(join(cwd, "peer-ai.config.json"))).toBe(true);
  });

  it("checks a review's report from the shell, as record_review does", async () => {
    const config = JSON.stringify({
      version: 1,
      project: { name: "Menu", stage: "mvp" },
      tracks: [{ id: "api", kind: "backend", status: "active" }],
    });
    const report = (coverage: unknown[], extra: Record<string, unknown> = {}) =>
      JSON.stringify({
        version: 1,
        skill: "security-review",
        at: "2026-10-02T09:15:00Z",
        scope: {},
        inputs: [],
        inventory: [],
        coverage,
        findings: [],
        result: "pass",
        summary: "Nothing found.",
        ...extra,
      });
    const every = skillRuleIds("security-review").map((rule) => ({
      rule,
      status: "not-applicable",
      reason: "Nothing here is of its kind.",
    }));
    const path = ".peer-ai/reports/project/security-review.json";
    const cwd = project({
      "peer-ai.config.json": config,
      [path]: report(every),
      "short.json": report(every.slice(2)),
      "unnamed.json": report(every, { skill: "peer-ai-security-review" }),
    });

    const passed = await run(["check-report", path], cwd);
    expect(passed).toMatchObject({ code: 0 });
    expect(passed.text).toBe(`✓ ${path} passes Peer AI's checks. Its result is pass.`);
    const short = await run(["check-report", "short.json"], cwd);
    expect(short.code).toBe(1);
    expect(short.text).toContain("✗ The report leaves out 2 of security-review's rules");
    const unnamed = await run(["check-report", "unnamed.json"], cwd);
    expect(unnamed.code).toBe(1);
    expect(unnamed.text).toContain(`doesn't name one of Peer AI's skills as its "skill"`);
    expect(JSON.parse((await run(["check-report", path, "--json"], cwd)).text)).toMatchObject({
      ok: true,
      result: "pass",
    });
    expect((await run(["check-report"], cwd)).code).toBe(2);
  });
});
