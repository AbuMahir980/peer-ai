import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { assess } from "./assess.ts";
import { diagnose } from "./doctor.ts";
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

/** A repairs booking API in FastAPI that takes payments. */
const repairs = () =>
  project({
    "services/api/requirements.txt": "fastapi==0.115.6\nstripe==12.0.0\n",
    "services/api/main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
    "CLAUDE.md": "# rules",
  });

const suggestionsCheck = (root: string) => diagnose(root, "24.3.0").checks.find((check) => check.id === "suggestions");

describe("suggested profiles and traits (RFC 0011)", () => {
  it("are taken up by init --yes, and it says so", async () => {
    const root = repairs();
    const out = capture();
    expect(await runInit(options(root, { yes: true }), undefined, out)).toBe(0);
    const config = readConfig(root);
    expect(config.standards).toEqual({ enforcement: "report", profiles: ["python-fastapi"] });
    expect(config.project?.traits).toEqual(["money"]);
    expect(out.text()).toContain("Took up what assess suggested: the python-fastapi profile and the money trait.");
    expect(suggestionsCheck(root)).toMatchObject({ status: "ok" });
  });

  it("are all ticked when init asks, and one unticked is declined, with why", async () => {
    const root = repairs();
    const prompter = scripted([
      "Repairs",
      "",
      true,
      "solo",
      "mvp",
      "critical",
      ["profile:python-fastapi"],
      "Payments go through the shop's own checkout service.",
    ]);
    expect(await runInit(options(root), prompter, capture())).toBe(0);
    expect(prompter.asked.at(-2)).toContain("Untick any that don't fit.");
    expect(prompter.asked.at(-1)).toBe(
      "Why doesn't the money trait fit? It's kept in the config, so it isn't suggested again.",
    );
    const config = readConfig(root);
    expect(config.standards?.profiles).toEqual(["python-fastapi"]);
    expect(config.project?.traits).toBeUndefined();
    expect(config.declined).toEqual([
      { trait: "money", reason: "Payments go through the shop's own checkout service." },
    ]);
    expect(suggestionsCheck(root)).toEqual({
      id: "suggestions",
      status: "ok",
      message: "The config has taken up or declined every profile and trait assess suggests (1 declined)",
    });
  });

  it("are raised by doctor until the config takes them up or declines them", async () => {
    const root = repairs();
    await runInit(options(root, { yes: true }), undefined, capture());
    const config = readConfig(root);
    delete config.project?.traits;
    writeFileSync(join(root, "peer-ai.config.json"), JSON.stringify({ ...config, standards: {} }));
    expect(suggestionsCheck(root)).toEqual({
      id: "suggestions",
      status: "warn",
      message:
        "assess suggests the python-fastapi profile (api is tagged fastapi) and the money trait (payment provider stripe).",
      fix: "Add them to standards.profiles and project.traits, or list them in declined, with why.",
    });

    const declined = {
      ...config,
      standards: {},
      declined: [
        { profile: "python-fastapi", reason: "The API is being rewritten." },
        { trait: "money", reason: "Payments are another team's service." },
      ],
    };
    writeFileSync(join(root, "peer-ai.config.json"), JSON.stringify(declined));
    expect(suggestionsCheck(root)).toMatchObject({ status: "ok" });
    const valid = validateConfig(declined);
    if (!valid.ok) throw new Error(valid.errors.join("\n"));
    const assessment = assess(root, valid.value, "mvp");
    expect(assessment.suggestedProfiles).toEqual([]);
    expect(assessment.suggestedTraits).toEqual([]);
  });

  it("can't be both taken up and declined", () => {
    const result = validateConfig({
      version: 1,
      project: { name: "Repairs", traits: ["money"] },
      tracks: [{ id: "api", kind: "backend", status: "active" }],
      standards: { profiles: ["python-fastapi"] },
      declined: [
        { profile: "python-fastapi", reason: "Changed our minds." },
        { trait: "money", reason: "Changed our minds." },
      ],
    });
    expect(result.ok ? [] : result.errors).toEqual([
      'declined.0.profile: "python-fastapi" is listed in standards.profiles too',
      'declined.1.trait: "money" is listed in project.traits too',
    ]);
  });
});

describe("a part that names no stack (RFC 0012)", () => {
  it("is named by doctor, with the stack detection finds, while profiles are listed", () => {
    const files = (profiles: string[]) =>
      project({
        "peer-ai.config.json": JSON.stringify({
          version: 1,
          project: { name: "Trips" },
          tracks: [{ id: "mobile", kind: "mobile", path: "apps/mobile", status: "active" }],
          standards: { profiles },
          declined: [{ profile: "react-native", reason: "Not yet." }],
        }),
        "apps/mobile/package.json": JSON.stringify({ dependencies: { "react-native": "0.82.0" } }),
      });
    const stacks = (root: string) => diagnose(root, "24.3.0").checks.filter((check) => check.id === "stacks");
    expect(stacks(files(["typescript"]))).toEqual([
      {
        id: "stacks",
        status: "warn",
        message: "mobile names no stack, so every profile listed applies to its files.",
        fix: 'Set its stack in peer-ai.config.json, as detected: "stack": ["javascript", "react-native"].',
      },
    ]);
    expect(stacks(files([]))).toEqual([]);
  });
});
