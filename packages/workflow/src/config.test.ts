import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateConfig } from "./index.ts";

const examplesDir = join(import.meta.dirname, "..", "examples");
const exampleFiles = readdirSync(examplesDir).filter((file) => file.endsWith(".config.json"));
const readExample = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(examplesDir, file), "utf8")) as Record<string, unknown>;
const tallyho = () => readExample("web-app-with-api.config.json");

function errorsFor(input: unknown): string[] {
  const result = validateConfig(input);
  return result.ok ? [] : result.errors;
}

describe("peer-ai.config.json", () => {
  it.each(exampleFiles)("accepts the example %s", (file) => {
    expect(errorsFor(readExample(file))).toEqual([]);
  });

  it("rejects a misspelt key instead of ignoring it", () => {
    expect(errorsFor({ ...tallyho(), trakcer: { kind: "none" } }).join("\n")).toContain("trakcer");
  });

  it("rejects a capability that is not one of Peer AI's skills", () => {
    const config = { ...tallyho(), capabilities: { "code-reveiw": { also: ["/code-review"] } } };
    expect(errorsFor(config).join("\n")).toMatch(/capabilities/);
  });

  it("rejects an add-on that is neither plugin:skill nor /command", () => {
    const config = { ...tallyho(), capabilities: { "code-review": { also: ["code review please"] } } };
    expect(errorsFor(config).join("\n")).toContain("plugin:skill");
  });

  it("requires a default model when models are pinned", () => {
    const config = { ...tallyho(), models: { policy: "pinned", byActivity: { build: "some-model" } } };
    expect(errorsFor(config).join("\n")).toContain("needs a default model");
  });

  it("rejects model names without the pinned policy", () => {
    const config = { ...tallyho(), models: { policy: "tiers", default: "some-model" } };
    expect(errorsFor(config).join("\n")).toContain("only used with the pinned policy");
  });

  it("rejects duplicate track ids", () => {
    const track = { id: "web", kind: "web", status: "active" };
    expect(errorsFor({ ...tallyho(), tracks: [track, track] }).join("\n")).toContain('duplicate track id "web"');
  });

  it("rejects a standards document scoped to a track that does not exist", () => {
    const config = {
      ...tallyho(),
      standards: { documents: [{ path: "docs/standards.md", role: "standard", scope: ["mobile"] }] },
    };
    expect(errorsFor(config).join("\n")).toContain('"mobile" is not a track id');
  });

  it("rejects a contract on an api of kind none", () => {
    const config = {
      ...tallyho(),
      shape: { api: { kind: "none", contract: { source: "handwritten" } }, design: { status: "none" } },
    };
    expect(errorsFor(config).join("\n")).toContain("has no contract");
  });

  it("rejects an activity that does not exist", () => {
    expect(errorsFor({ ...tallyho(), activities: { review: { notes: ["x"] } } }).join("\n")).toMatch(/activities/);
  });

  it("reports where each problem is", () => {
    const config = { ...tallyho(), tracks: [{ id: "Web App", kind: "web", status: "active" }] };
    expect(errorsFor(config).join("\n")).toContain("tracks.0.id:");
  });
});
