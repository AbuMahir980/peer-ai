import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DOMAINS } from "@peer-ai/workflow";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import { CORE_RULES, PROFILES, profileRulesFor, profilesForPart, type ProfileInput } from "./index.ts";
import { applyProfiles, checkProfiles, profilesFor, type Example, type Value } from "./profile.ts";

const CORE_PREFIXES = Object.values(DOMAINS);

/** A rule with every part a profile rule needs, for tests that change one of them. */
const rule = (id: string, extra: Partial<ProfileInput["rules"][number]> = {}): ProfileInput["rules"][number] => ({
  id,
  title: "Bikes are named",
  rule: "Every bike has a name.",
  why: "Mechanics call bikes by name.",
  ask: "Does every bike have a name?",
  stage: "mvp",
  check: "ai-review",
  severity: "low",
  carries: "CODE-01",
  ...extra,
});

const profileInput = (id: string, prefix: string, extra: Partial<ProfileInput> = {}): ProfileInput => ({
  id,
  name: id,
  prefix,
  about: "A made-up stack.",
  stacks: [id],
  rules: [rule(`${prefix}-01`)],
  ...extra,
});

describe("stack profiles", () => {
  it("load and pass their checks", () => {
    expect(PROFILES.map((profile) => profile.id)).toContain("typescript");
    for (const profile of PROFILES) {
      for (const each of profile.rules) {
        expect(
          CORE_RULES.some((core) => core.id === each.carries),
          each.id,
        ).toBe(true);
        if (each.check === "auto") expect(each.examples, each.id).toBeDefined();
      }
    }
  });

  it("refuse a rule that carries no core rule, or uses another profile's prefix", () => {
    const { problems } = checkProfiles(
      [
        profileInput("wheels", "WH", { rules: [rule("WH-01", { carries: "CODE-99" }), rule("SP-02")] }),
        profileInput("spokes", "CODE"),
      ],
      CORE_RULES,
      CORE_PREFIXES,
    );
    expect(problems).toEqual([
      "WH-01: it carries CODE-99, which isn't a core rule",
      "SP-02: a wheels rule's id starts with WH-",
      "spokes: the prefix CODE is already used",
    ]);
  });

  it("refuse an automatic rule without its enforcer and examples, and {value} without a default", () => {
    const { problems } = checkProfiles(
      [
        profileInput("wheels", "WH", {
          rules: [
            rule("WH-01", { check: "auto" }),
            rule("WH-02", {
              check: "auto",
              enforcer: { tool: "eslint", rule: "max-depth" },
            }),
            rule("WH-03", { title: "Under {value} spokes" }),
          ],
        }),
      ],
      CORE_RULES,
      CORE_PREFIXES,
    );
    expect(problems).toEqual([
      "wheels: rules.0.enforcer: an automatic rule names its enforcer",
      "wheels: rules.1.examples: an enforced rule has an example that must fail and one that must pass",
      "wheels: rules.2.default: a rule that uses {value} has a default",
    ]);
  });

  it("refuse a profile that extends one that doesn't exist, or itself", () => {
    const { problems } = checkProfiles(
      [
        profileInput("wheels", "WH", { extends: ["tyres"] }),
        profileInput("frames", "FR", { extends: ["forks"] }),
        profileInput("forks", "FK", { extends: ["frames"] }),
      ],
      CORE_RULES,
      CORE_PREFIXES,
    );
    expect(problems).toEqual([
      "wheels: it extends tyres, which isn't a profile",
      "frames: it extends itself",
      "forks: it extends itself",
    ]);
  });
});

describe("which profiles apply to a part", () => {
  const { profiles } = checkProfiles(
    [
      profileInput("base", "BA", { stacks: ["typescript"] }),
      profileInput("web", "WE", { stacks: ["react"], extends: ["base"] }),
      profileInput("phone", "PH", { stacks: ["expo"], extends: ["web"] }),
      profileInput("pipeline", "PI", { stacks: [] }),
    ],
    CORE_RULES,
    CORE_PREFIXES,
  );
  const ids = (listed: string[], stack?: string[]) =>
    profilesFor(profiles, listed, stack === undefined ? {} : { stack }).map((profile) => profile.id);

  it("follows the part's stack, and brings the profiles it extends, bases first", () => {
    expect(ids(["phone"], ["typescript", "expo"])).toEqual(["base", "web", "phone"]);
    expect(ids(["web", "phone"], ["typescript", "react"])).toEqual(["base", "web"]);
  });

  it("gives a part with no stack every listed profile, and a profile with no stacks to every part", () => {
    expect(ids(["web"])).toEqual(["base", "web"]);
    expect(ids(["pipeline", "web"], ["python"])).toEqual(["pipeline"]);
  });

  it("ignores ids with no profile", () => {
    expect(ids(["vue", "base"], ["typescript"])).toEqual(["base"]);
  });
});

describe("a profile's rules for one project", () => {
  const { profiles } = checkProfiles(
    [
      profileInput("wheels", "WH", {
        rules: [
          rule("WH-01", {
            title: "Wheels have at most {value} spokes",
            default: { value: 32, unit: "spokes" },
            check: "auto",
            enforcer: { tool: "eslint", rule: "max-depth", options: [{ max: "$value" }] },
            examples: { file: "a.ts", fails: "a", passes: "b" },
          }),
          rule("WH-02", { stage: "production" }),
          rule("WH-03", { architectures: ["layered"] }),
        ],
      }),
    ],
    CORE_RULES,
    CORE_PREFIXES,
  );
  const select = (extra: Partial<Parameters<typeof applyProfiles>[1]> = {}) =>
    applyProfiles(profiles, { listed: ["wheels"], stack: ["wheels"], stage: "mvp", ...extra });

  it("keeps rules for the stage and the architecture", () => {
    expect(select().map((each) => each.id)).toEqual(["WH-01"]);
    expect(select({ stage: "production", architecture: "layered" }).map((each) => each.id)).toEqual([
      "WH-01",
      "WH-02",
      "WH-03",
    ]);
  });

  it("puts the default, or the project's value, in the text and the enforcer", () => {
    const [byDefault] = select();
    expect(byDefault?.title).toBe("Wheels have at most 32 spokes");
    const [changed] = select({ overrides: { "WH-01": { value: 36 } } });
    expect(changed?.title).toBe("Wheels have at most 36 spokes");
    expect(changed?.value).toBe(36);
    expect(changed?.enforcer).toEqual({ tool: "eslint", rule: "max-depth", options: [{ max: 36 }] });
  });
});

describe("the TypeScript profile", () => {
  it("applies to TypeScript parts, and fills in its defaults", () => {
    expect(profilesForPart(["typescript"], { stack: ["typescript", "express"] }).map((p) => p.id)).toEqual([
      "typescript",
    ]);
    const rules = profileRulesFor({ listed: ["typescript"], stack: ["typescript"], stage: "mvp" });
    expect(rules.find((each) => each.id === "TS-06")?.title).toBe("Nesting stays 3 levels deep or less");
  });
});

// A compiler setting is proven like a lint rule: the failing example compiles cleanly with the
// setting switched off, and doesn't with it on, so it's the setting that catches it; the passing
// example compiles. Off is said explicitly, since TypeScript 6 turns strict on by default.
describe("compiler settings, run through the compiler", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  });

  const diagnostics = (file: string, code: string, options: ts.CompilerOptions): string[] => {
    dir = mkdtempSync(join(tmpdir(), "peer-ai-tsc-"));
    const path = join(dir, file);
    writeFileSync(path, code);
    const program = ts.createProgram([path], {
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      types: [],
      skipLibCheck: true,
      ...options,
    });
    return ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
  };
  const text = (example: Example, value: Value | undefined) =>
    typeof example === "string" ? example : example(value ?? 0);

  const enforced = PROFILES.flatMap((profile) => profile.rules).filter((each) => each.enforcer?.tool === "typescript");

  it.each(enforced.map((each) => [each.id, each] as const))("%s fails its example, and passes the other", (_, each) => {
    if (each.enforcer?.tool !== "typescript" || each.examples === undefined) throw new Error("not a compiler rule");
    const { option, value } = each.enforcer;
    const on = { [option]: value } as ts.CompilerOptions;
    const { file, fails, passes } = each.examples;
    if (typeof value === "boolean") {
      expect(diagnostics(file, text(fails, each.default?.value), { [option]: !value })).toEqual([]);
    }
    expect(diagnostics(file, text(fails, each.default?.value), on)).not.toEqual([]);
    expect(diagnostics(file, text(passes, each.default?.value), on)).toEqual([]);
  });
});
