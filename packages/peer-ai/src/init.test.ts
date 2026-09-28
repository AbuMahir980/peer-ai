import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateConfig } from "@peer-ai/workflow";
import { afterEach, describe, expect, it } from "vitest";
import { runInit, type InitOptions } from "./init.ts";
import { capture, cleanUp, project, scripted } from "./test-helpers.ts";

afterEach(cleanUp);

const options = (cwd: string, extra: Partial<InitOptions> = {}): InitOptions => ({
  cwd,
  yes: false,
  dryRun: false,
  ...extra,
});
const readConfig = (root: string) =>
  JSON.parse(readFileSync(join(root, "peer-ai.config.json"), "utf8")) as Record<string, Record<string, unknown>>;

const monorepo = () =>
  project(
    {
      "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      "package.json": JSON.stringify({ name: "acme", private: true }),
      "apps/web/package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
      "services/api/requirements.txt": "fastapi==0.115.6\n",
      "CLAUDE.md": "# rules",
    },
    { gitRemote: "git@github.com:acme/acme.git" },
  );

describe("peer-ai init --yes", () => {
  it("writes a valid config from what it detects", async () => {
    const root = monorepo();
    const out = capture();
    expect(await runInit(options(root, { yes: true }), undefined, out)).toBe(0);
    const config = readConfig(root);
    expect(validateConfig(config).ok).toBe(true);
    expect(config.project).toEqual({ name: "acme", stage: "mvp", origin: "existing", team: "solo" });
    expect(config.tools).toEqual(["claude-code"]);
    expect(config.repo).toEqual({ host: "github", remote: "origin" });
    expect((config.tracks as unknown as { id: string }[]).map((track) => track.id)).toEqual(["web", "api"]);
    expect(readFileSync(join(root, "peer-ai.config.json"), "utf8").endsWith("}\n")).toBe(true);
    expect(out.text()).toContain("Wrote peer-ai.config.json: 2 parts, mvp stage.");
  });

  it("takes flags over detected values", async () => {
    const root = monorepo();
    await runInit(
      options(root, { yes: true, name: "Acme Shop", stage: "production", team: "team", tools: ["codex"] }),
      undefined,
      capture(),
    );
    const config = readConfig(root);
    expect(config.project).toMatchObject({ name: "Acme Shop", stage: "production", team: "team" });
    expect(config.tools).toEqual(["codex"]);
  });

  it("does not assume a stack for an empty folder", async () => {
    const root = project();
    await runInit(options(root, { yes: true }), undefined, capture());
    const config = readConfig(root);
    expect(config.project?.origin).toBe("new");
    expect(config.tracks).toEqual([
      { id: "app", kind: "other", status: "active", note: "Set the kind and stack once they are decided." },
    ]);
    expect(config).not.toHaveProperty("tools");
  });
});

describe("peer-ai init, asking questions", () => {
  it("uses the answers, including replacing the detected parts", async () => {
    const root = monorepo();
    const prompter = scripted([
      "Acme Driver",
      "Delivery app for drivers",
      false,
      "mobile",
      "Kotlin, Android",
      "team",
      "prototype",
    ]);
    expect(await runInit(options(root), prompter, capture())).toBe(0);
    const config = readConfig(root);
    expect(config.project).toEqual({
      name: "Acme Driver",
      description: "Delivery app for drivers",
      stage: "prototype",
      origin: "existing",
      team: "team",
    });
    expect(config.tracks).toEqual([{ id: "app", kind: "mobile", stack: ["kotlin", "android"], status: "active" }]);
  });

  it("asks which AI tools are used only when none are detected", async () => {
    const root = project();
    const prompter = scripted(["Side Project", "", "web", "", "solo", "mvp", ["codex", "cursor"]]);
    await runInit(options(root), prompter, capture());
    expect(prompter.asked.at(-1)).toBe("Which AI tools do you use?");
    expect(readConfig(root).tools).toEqual(["codex", "cursor"]);
  });

  it("writes nothing when the user cancels", async () => {
    const root = project();
    const out = capture();
    expect(await runInit(options(root), scripted(["Name", "CANCEL"]), out)).toBe(1);
    expect(existsSync(join(root, "peer-ai.config.json"))).toBe(false);
    expect(out.text()).toContain("Nothing was written");
  });
});

describe("what peer-ai init refuses to do", () => {
  it("never overwrites an existing config", async () => {
    const root = project({ "peer-ai.config.json": '{"mine":true}\n' });
    const out = capture();
    expect(await runInit(options(root, { yes: true }), undefined, out)).toBe(1);
    expect(readFileSync(join(root, "peer-ai.config.json"), "utf8")).toBe('{"mine":true}\n');
    expect(out.text()).toContain("never overwrites");
  });

  it("asks for --yes when there is no terminal to ask questions in", async () => {
    const out = capture();
    expect(await runInit(options(project()), undefined, out)).toBe(2);
    expect(out.text()).toContain("--yes");
  });

  it("writes nothing on a dry run, and prints the config instead", async () => {
    const root = project();
    const out = capture();
    expect(await runInit(options(root, { yes: true, dryRun: true }), undefined, out)).toBe(0);
    expect(existsSync(join(root, "peer-ai.config.json"))).toBe(false);
    expect(validateConfig(JSON.parse(out.text())).ok).toBe(true);
  });
});
