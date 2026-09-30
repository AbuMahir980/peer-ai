import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROFILES, type Example, type Profile, type Value } from "@peer-ai/standards";
import { validateConfig, type PeerAiConfig } from "@peer-ai/workflow";
import { ESLint } from "eslint";
import { afterEach, describe, expect, it } from "vitest";
import peerAi, { configFor, pluginOf } from "./index.ts";

/** A valid config for a made-up bicycle repair booking service. */
function repairs(extra: { stage?: "prototype" | "mvp" | "production"; standards?: unknown; tracks?: unknown[] } = {}) {
  const result = validateConfig({
    version: 1,
    project: { name: "Repairs", stage: extra.stage ?? "mvp", origin: "existing", team: "solo" },
    tools: ["claude-code"],
    tracks: extra.tracks ?? [
      { id: "web", kind: "web", status: "active", path: "apps/web", stack: ["typescript", "react"] },
      { id: "api", kind: "backend", status: "active", path: "services/api", stack: ["python", "fastapi"] },
    ],
    tracker: { kind: "none", ticketPrefix: "RP" },
    standards: extra.standards ?? { profiles: ["typescript"] },
  });
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.value;
}

const ruleNames = (blocks: ReturnType<typeof configFor>) => blocks.flatMap((block) => Object.keys(block.rules ?? {}));

describe("Peer AI's ESLint settings", () => {
  it("cover each part its profiles apply to, with typed rules for TypeScript files only", () => {
    const blocks = configFor(repairs(), "/repairs");
    expect(blocks.map((block) => [block.name, block.files])).toEqual([
      [
        "peer-ai/web",
        ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"].map(
          (glob) => `apps/web/${glob}`,
        ),
      ],
      ["peer-ai/web/typed", ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"].map((glob) => `apps/web/${glob}`)],
    ]);
    expect(blocks[1]?.rules).toHaveProperty("@typescript-eslint/no-floating-promises", ["error"]);
  });

  it("keep to the project's stage", () => {
    expect(ruleNames(configFor(repairs({ stage: "prototype" }), "/repairs"))).toEqual([
      "@typescript-eslint/no-explicit-any",
      "no-empty",
    ]);
  });

  it("use the project's values, and leave out what it set aside", () => {
    const blocks = configFor(
      repairs({
        standards: {
          profiles: ["typescript"],
          overrides: { "TS-06": { value: 4, reason: "The booking rules nest one level deeper." } },
          exceptions: [{ rule: "TS-03", reason: "Generated code asserts values.", decidedBy: "Ada" }],
        },
      }),
      "/repairs",
    );
    expect(blocks[0]?.rules?.["max-depth"]).toEqual(["error", { max: 4 }]);
    expect(ruleNames(blocks)).not.toContain("@typescript-eslint/no-non-null-assertion");
  });

  it("give a part with no path the whole repository, and nothing without profiles", () => {
    const whole = configFor(repairs({ tracks: [{ id: "app", kind: "web", status: "active" }] }), "/repairs");
    expect(whole[0]?.files).toContain("**/*.ts");
    expect(configFor(repairs({ standards: {} }), "/repairs")).toEqual([]);
  });

  it("name each rule's plugin by its prefix", () => {
    expect(pluginOf("@typescript-eslint/no-explicit-any")).toBe("@typescript-eslint");
    expect(pluginOf("react-hooks/rules-of-hooks")).toBe("react-hooks");
    expect(pluginOf("max-depth")).toBeUndefined();
  });
});

describe("reading the project's config", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  });

  it("builds the settings from peer-ai.config.json, and says when there isn't one", () => {
    const root = mkdtempSync(join(tmpdir(), "peer-ai-eslint-"));
    dir = root;
    expect(() => peerAi({ root })).toThrow("There's no peer-ai.config.json");
    writeFileSync(join(root, "peer-ai.config.json"), JSON.stringify(repairs()));
    expect(peerAi({ root }).map((block) => block.name)).toEqual(["peer-ai/web", "peer-ai/web/typed"]);
  });
});

// Every rule ESLint enforces is seen to fail (RFC 0006): its failing example gets the rule's error,
// through the same settings a project gets, and its passing example gets no error at all. A rule
// with a value is run again with a changed one, so the project's value is seen to reach the tool.
describe("every rule ESLint enforces, run through ESLint", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  const text = (example: Example, value: Value | undefined) =>
    typeof example === "string" ? example : example(value ?? 0);

  async function lint(profile: Profile, file: string, code: string, overrides: Record<string, unknown> = {}) {
    const dir = mkdtempSync(join(tmpdir(), "peer-ai-eslint-"));
    dirs.push(dir);
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, target: "es2022", module: "esnext", moduleResolution: "bundler", types: [] },
        include: ["*.ts", "*.tsx"],
      }),
    );
    writeFileSync(join(dir, file), code);
    const config: PeerAiConfig = repairs({
      stage: "production",
      tracks: [{ id: "app", kind: "web", status: "active", stack: [...profile.stacks] }],
      standards: { profiles: [profile.id], overrides },
    });
    const eslint = new ESLint({ cwd: dir, overrideConfigFile: true, overrideConfig: configFor(config, dir) });
    const [result] = await eslint.lintText(code, { filePath: join(dir, file) });
    return (result?.messages ?? []).map((message) => message.ruleId ?? message.message);
  }

  const enforced = PROFILES.flatMap((profile) =>
    profile.rules.filter((rule) => rule.enforcer?.tool === "eslint").map((rule) => [rule.id, profile, rule] as const),
  );

  it.each(enforced)(
    "%s fails its example, and passes the other",
    async (_, profile, rule) => {
      if (rule.enforcer?.tool !== "eslint" || rule.examples === undefined) throw new Error("not an ESLint rule");
      const { file, fails, passes } = rule.examples;
      const value = rule.default?.value;
      expect(await lint(profile, file, text(fails, value))).toContain(rule.enforcer.rule);
      expect(await lint(profile, file, text(passes, value))).toEqual([]);
      if (typeof value === "number") {
        const changed = { [rule.id]: { value: value + 2, reason: "A made-up project's choice." } };
        expect(await lint(profile, file, text(fails, value), changed)).toEqual([]);
        expect(await lint(profile, file, text(fails, value + 2), changed)).toContain(rule.enforcer.rule);
      }
    },
    60_000,
  );
});
