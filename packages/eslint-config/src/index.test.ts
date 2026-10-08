import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROFILES, type Example, type Profile, type Value } from "peer-ai-standards";
import { validateConfig, type PeerAiConfig } from "peer-ai-workflow";
import { ESLint, type Linter } from "eslint";
import tseslint from "typescript-eslint";
import { afterEach, describe, expect, it } from "vitest";
import peerAi, { configFor, eslintName, findRoot, pluginOf } from "./index.ts";

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
    expect(blocks[1]?.rules).toHaveProperty(["peer-ai-typescript/no-floating-promises"], ["error"]);
  });

  it("never let a rule that only reports replace one that enforces the same ESLint rule (#235)", () => {
    const blocks = configFor(
      repairs({
        standards: {
          profiles: ["react"],
          deferred: [{ rule: "REACT-03", until: "2026-12-01", reason: "Screens shrink first.", decidedBy: "Ada" }],
        },
      }),
      "/repairs",
      new Date("2026-10-08T09:00:00Z"),
    );
    // The file-size rule's error at 400 still covers .tsx files: the deferred component rule's
    // warning would have replaced it there.
    expect(blocks.find((block) => block.name === "peer-ai/web")?.rules).toHaveProperty(
      ["peer-ai/max-lines"],
      ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    );
    for (const block of blocks.filter((each) => each.name?.includes("*.tsx") === true)) {
      expect(block.rules).not.toHaveProperty(["peer-ai/max-lines"]);
    }
  });

  it("keep to the project's stage", () => {
    expect(ruleNames(configFor(repairs({ stage: "prototype" }), "/repairs"))).toEqual([
      "peer-ai-typescript/no-explicit-any",
      "peer-ai/no-empty",
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
    expect(blocks[0]?.rules?.["peer-ai/max-depth"]).toEqual(["error", { max: 4 }]);
    expect(ruleNames(blocks)).not.toContain("peer-ai-typescript/no-non-null-assertion");
  });

  it("only warn while the project reports, or a rule is deferred (RFC 0011)", () => {
    const report = configFor(repairs({ standards: { profiles: ["typescript"], enforcement: "report" } }), "/repairs");
    const levels = report.flatMap((block) =>
      Object.values(block.rules ?? {}).map((setting) => (Array.isArray(setting) ? setting[0] : setting)),
    );
    expect(new Set(levels)).toEqual(new Set(["warn"]));

    const deferred = repairs({
      standards: {
        profiles: ["typescript"],
        deferred: [{ rule: "TS-06", until: "2026-11-02", reason: "After the launch.", decidedBy: "Ada" }],
      },
    });
    const before = configFor(deferred, "/repairs", new Date("2026-10-02T09:00:00Z"));
    expect(before[0]?.rules?.["peer-ai/max-depth"]).toEqual(["warn", { max: 3 }]);
    expect(before[1]?.rules?.["peer-ai-typescript/no-floating-promises"]).toEqual(["error"]);
    const after = configFor(deferred, "/repairs", new Date("2026-11-02T09:00:00Z"));
    expect(after[0]?.rules?.["peer-ai/max-depth"]).toEqual(["error", { max: 3 }]);
  });

  it("give a part with no path the whole repository, and nothing without profiles", () => {
    const whole = configFor(repairs({ tracks: [{ id: "app", kind: "web", status: "active" }] }), "/repairs");
    expect(whole[0]?.files).toContain("**/*.ts");
    expect(configFor(repairs({ standards: {} }), "/repairs")).toEqual([]);
  });

  it("anchor every block at the project's root, wherever the ESLint config lives", () => {
    expect(new Set(configFor(repairs(), "/repairs").map((block) => block.basePath))).toEqual(new Set(["/repairs"]));
  });

  it("leave the parts nested inside a part to their own settings", () => {
    const blocks = configFor(
      repairs({
        tracks: [
          { id: "site", kind: "web", status: "active", stack: ["typescript"] },
          { id: "legacy", kind: "web", status: "active", path: "packages/legacy", stack: ["javascript"] },
        ],
      }),
      "/repairs",
    );
    expect(blocks.map((block) => [block.name, block.ignores])).toEqual([
      ["peer-ai/site", ["packages/legacy/**"]],
      ["peer-ai/site/typed", ["packages/legacy/**"]],
    ]);
  });

  it("name each rule's plugin by its prefix, and run it under a name Peer AI owns", () => {
    expect(pluginOf("@typescript-eslint/no-explicit-any")).toBe("@typescript-eslint");
    expect(pluginOf("react-hooks/rules-of-hooks")).toBe("react-hooks");
    expect(pluginOf("max-depth")).toBeUndefined();
    expect(eslintName("jsx-a11y/alt-text")).toBe("peer-ai-jsx-a11y/alt-text");
    expect(eslintName("@next/next/no-img-element")).toBe("peer-ai-next/no-img-element");
    expect(eslintName("max-depth")).toBe("peer-ai/max-depth");
  });
});

describe("reading the project's config", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  });

  it("finds the config from a folder inside the project", () => {
    const root = mkdtempSync(join(tmpdir(), "peer-ai-eslint-"));
    dir = root;
    mkdirSync(join(root, "apps/web/src"), { recursive: true });
    writeFileSync(join(root, "peer-ai.config.json"), JSON.stringify(repairs()));
    expect(findRoot(join(root, "apps/web/src"))).toBe(root);
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
        compilerOptions: {
          strict: true,
          target: "es2022",
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          types: [],
        },
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

  it("share typescript-eslint with a project that registers it too", async () => {
    const dir = mkdtempSync(join(tmpdir(), "peer-ai-eslint-"));
    dirs.push(dir);
    const config = repairs({ tracks: [{ id: "app", kind: "web", status: "active", stack: ["typescript"] }] });
    const own = tseslint.configs.recommended as Linter.Config[];
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: true,
      overrideConfig: [...configFor(config, dir), ...own],
    });
    const [result] = await eslint.lintText("export const bay = 1;\n", { filePath: join(dir, "bay.js") });
    expect(result?.messages).toEqual([]);
  });

  it("sit beside a project's own plugins and settings, whatever they are", async () => {
    const dir = mkdtempSync(join(tmpdir(), "peer-ai-eslint-"));
    dirs.push(dir);
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, jsx: "react-jsx" } }));
    const config = repairs({
      stage: "production",
      tracks: [{ id: "app", kind: "mobile", status: "active", stack: ["typescript", "expo"] }],
      standards: { profiles: ["react-native"] },
    });
    // Another package under jsx-a11y, as eslint-config-next registers, and the project's own list.
    const own: Linter.Config[] = [
      { plugins: { "jsx-a11y": { rules: {} } } },
      { rules: { "no-restricted-syntax": ["error", "WithStatement"] } },
    ];
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: true,
      overrideConfig: [...configFor(config, dir), ...own],
    });
    const code =
      'import { Text } from "react-native";\nexport const Price = () => <Text allowFontScaling={false}>£45</Text>;\n';
    writeFileSync(join(dir, "price.tsx"), code);
    const [result] = await eslint.lintText(code, { filePath: join(dir, "price.tsx") });
    expect(result?.messages.map((message) => message.ruleId ?? message.message)).toContain(
      "peer-ai/no-restricted-syntax",
    );
  });

  const enforced = PROFILES.flatMap((profile) =>
    profile.rules.filter((rule) => rule.enforcer?.tool === "eslint").map((rule) => [rule.id, profile, rule] as const),
  );

  it.each(enforced)(
    "%s fails its example, and passes the other",
    async (_, profile, rule) => {
      if (rule.enforcer?.tool !== "eslint" || rule.examples === undefined) throw new Error("not an ESLint rule");
      const { file, fails, passes } = rule.examples;
      const value = rule.default?.value;
      const name = eslintName(rule.enforcer.rule);
      expect(await lint(profile, file, text(fails, value))).toContain(name);
      expect(await lint(profile, file, text(passes, value))).toEqual([]);
      if (typeof value === "number") {
        const changed = { [rule.id]: { value: value + 2, reason: "A made-up project's choice." } };
        expect(await lint(profile, file, text(fails, value), changed)).toEqual([]);
        expect(await lint(profile, file, text(fails, value + 2), changed)).toContain(name);
      }
    },
    60_000,
  );
});
