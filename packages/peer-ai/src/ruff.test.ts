import { PositionEncoding, Workspace } from "@astral-sh/ruff-wasm-nodejs";
import { PROFILES, profileRulesFor, type Example, type Value } from "@peer-ai/standards";
import type { PeerAiConfig } from "@peer-ai/workflow";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import { ruffFile, ruffSettings, toToml } from "./ruff.ts";

const repairs = (standards: PeerAiConfig["standards"], stage: "mvp" | "production" = "mvp"): PeerAiConfig => ({
  version: 1,
  project: { name: "Repairs", stage },
  tracks: [
    { id: "api", kind: "backend", path: "services/api", status: "active", stack: ["python", "fastapi"] },
    { id: "web", kind: "web", path: "apps/web", status: "active", stack: ["typescript", "react"] },
  ],
  ...(standards === undefined ? {} : { standards }),
});

describe("Ruff's settings", () => {
  it("add every automatic Ruff rule to Ruff's own, with the settings they read", () => {
    const settings = ruffSettings(profileRulesFor({ listed: ["python"], stack: ["python"], stage: "mvp" }));
    // extend-select keeps Ruff's defaults and the project's choices; select would replace them.
    expect(settings.lint).not.toHaveProperty("select");
    expect(settings.lint["extend-select"]).toEqual(expect.arrayContaining(["E722", "S608", "PLR0915"]));
    expect(settings.lint.pylint).toEqual({ "max-statements": 50 });
  });

  it("are written as TOML that reads back as the same settings", () => {
    const settings = ruffSettings(profileRulesFor({ listed: ["python"], stack: ["python"], stage: "mvp" }));
    expect(parse(toToml(settings))).toEqual(settings);
  });

  it("make a file for a project whose profiles have Ruff rules, with its values", () => {
    const file = ruffFile(
      repairs({
        profiles: ["python-fastapi", "react"],
        overrides: { "PY-10": { value: 70, reason: "Report builders run long" } },
      }),
    );
    expect(file).toContain("[lint.pylint]\nmax-statements = 70");
    expect(ruffFile(repairs({ profiles: ["react"] }))).toBeUndefined();
  });
});

// Every rule Ruff enforces is seen to fail (RFC 0006): its failing example gets the rule's code,
// through the settings a project gets for its profile, and its passing example gets nothing at
// all. A rule with a value is run again with a changed one, so the value is seen to reach Ruff.
describe("every rule Ruff enforces, run through Ruff", () => {
  const text = (example: Example, value: Value | undefined) =>
    typeof example === "string" ? example : example(value ?? 0);

  function check(profile: string, code: string, overrides: Record<string, { value: Value }> = {}): string[] {
    const rules = profileRulesFor({ listed: [profile], stack: [], stage: "production", overrides });
    // Through the TOML render writes, so what's proven is the file a project extends.
    const workspace = new Workspace(parse(toToml(ruffSettings(rules))), PositionEncoding.Utf16);
    return (workspace.check(code) as { code: string | null; message: string }[]).map((d) => d.code ?? d.message);
  }

  const enforced = PROFILES.flatMap((profile) =>
    profile.rules.filter((rule) => rule.enforcer?.tool === "ruff").map((rule) => [rule.id, profile.id, rule] as const),
  );

  it.each(enforced)("%s fails its example, and passes the other", (_, profile, rule) => {
    if (rule.enforcer?.tool !== "ruff" || rule.examples === undefined) throw new Error("not a Ruff rule");
    const { fails, passes } = rule.examples;
    const value = rule.default?.value;
    expect(check(profile, text(fails, value))).toContain(rule.enforcer.rule);
    expect(check(profile, text(passes, value))).toEqual([]);
    if (typeof value === "number") {
      const changed = { [rule.id]: { value: value + 2 } };
      expect(check(profile, text(fails, value), changed)).toEqual([]);
      expect(check(profile, text(fails, value + 2), changed)).toContain(rule.enforcer.rule);
    }
  });
});
