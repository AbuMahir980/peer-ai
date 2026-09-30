import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig, validateConfig, validateConfigLayer } from "./index.ts";

const examplesDir = join(import.meta.dirname, "..", "examples");
const exampleFiles = readdirSync(examplesDir).filter((file) => file.endsWith(".config.json"));
const readJson = (...path: string[]): Record<string, unknown> =>
  JSON.parse(readFileSync(join(examplesDir, ...path), "utf8")) as Record<string, unknown>;

const minimal = () => ({
  version: 1,
  project: { name: "Test" },
  tracks: [
    { id: "web", kind: "web", status: "active" },
    { id: "api", kind: "backend", status: "active" },
  ],
});

function errorsFor(input: unknown): string {
  const result = validateConfig(input);
  return result.ok ? "" : result.errors.join("\n");
}

describe("peer-ai.config.json examples", () => {
  it.each(exampleFiles)("accepts %s", (file) => {
    expect(errorsFor(readJson(file))).toBe("");
  });

  it("accepts an informal project's config of a few lines", () => {
    expect(
      errorsFor({ version: 1, project: { name: "x" }, tracks: [{ id: "app", kind: "web", status: "active" }] }),
    ).toBe("");
  });
});

describe("a shared base config", () => {
  const base = () => readJson("studio", "base.config.json");
  const project = () => readJson("studio", "project.config.json");

  it("is valid as a layer on its own", () => {
    const result = validateConfigLayer(base());
    expect(result.ok ? "" : result.errors.join("\n")).toBe("");
  });

  it("resolves with a project into a valid config", () => {
    expect(errorsFor(resolveConfig([base(), project()]))).toBe("");
  });

  it("lets the project's values win, merges objects and replaces lists", () => {
    const resolved = resolveConfig([base(), project()]) as Record<string, Record<string, unknown>>;
    expect(resolved.standards?.profiles).toEqual(["typescript", "react"]);
    expect(resolved.repo?.host).toBe("github");
    expect(resolved.compliance?.packs).toEqual(["ndpa"]);
    expect(resolved).not.toHaveProperty("extends");
  });
});

describe("what peer-ai.config.json rejects", () => {
  it("a misspelt key, instead of ignoring it", () => {
    expect(errorsFor({ ...minimal(), trakcer: { kind: "none" } })).toContain("trakcer");
  });

  it("a capability that is not one of Peer AI's skills", () => {
    expect(errorsFor({ ...minimal(), capabilities: { "code-reveiw": { also: ["/code-review"] } } })).toMatch(
      /capabilities/,
    );
  });

  it("an add-on that is neither plugin:skill nor /command", () => {
    const config = { ...minimal(), capabilities: { "code-review": { also: ["code review please"] } } };
    expect(errorsFor(config)).toContain("plugin:skill");
  });

  it("an activity that does not exist", () => {
    expect(errorsFor({ ...minimal(), activities: { review: { notes: ["x"] } } })).toMatch(/activities/);
  });

  it("pinned models without a default, and model names without the pinned policy", () => {
    expect(errorsFor({ ...minimal(), models: { policy: "pinned", byActivity: { build: "m" } } })).toContain(
      "needs a default model",
    );
    expect(errorsFor({ ...minimal(), models: { policy: "tiers", default: "m" } })).toContain(
      "only used with the pinned policy",
    );
  });

  it("duplicate track, api or environment ids", () => {
    const track = { id: "web", kind: "web", status: "active" };
    expect(errorsFor({ ...minimal(), tracks: [track, track] })).toContain('duplicate track id "web"');
    const api = { id: "api", kind: "http" };
    expect(errorsFor({ ...minimal(), apis: [api, api] })).toContain('duplicate api id "api"');
    expect(errorsFor({ ...minimal(), environments: [{ id: "prod" }, { id: "prod" }] })).toContain(
      'duplicate environment id "prod"',
    );
  });

  it("references to tracks, apis and environments that do not exist", () => {
    const config = {
      ...minimal(),
      tracks: [
        {
          id: "web",
          kind: "web",
          status: "active",
          uses: ["core"],
          consumes: ["payments"],
          deploy: { target: "vercel", environments: ["prod"] },
        },
      ],
      apis: [{ id: "orders", kind: "http", providedBy: "orders-service" }],
    };
    const errors = errorsFor(config);
    expect(errors).toContain('"core" is not a track id');
    expect(errors).toContain('"payments" is not an api id');
    expect(errors).toContain('"prod" is not an environment id');
    expect(errors).toContain('"orders-service" is not a track id');
  });

  it("a standards document scoped to a track that does not exist", () => {
    const config = { ...minimal(), standards: { documents: [{ path: "s.md", role: "standard", scope: ["mobile"] }] } };
    expect(errorsFor(config)).toContain('"mobile" is not a track id');
  });

  it("an external track with no repository, and a repository on a track that is not external", () => {
    expect(errorsFor({ ...minimal(), tracks: [{ id: "api", kind: "backend", status: "external" }] })).toContain(
      "names the repository it lives in",
    );
    expect(
      errorsFor({ ...minimal(), tracks: [{ id: "api", kind: "backend", status: "active", repo: "a/b" }] }),
    ).toContain("only an external track");
  });

  it("a retiring track with no replacement, and a replacement on a track that is not retiring", () => {
    const tracks = (status: string, replacedBy?: string[]) => [
      { id: "old", kind: "web", status, ...(replacedBy ? { replacedBy } : {}) },
      { id: "new", kind: "web", status: "active" },
    ];
    expect(errorsFor({ ...minimal(), tracks: tracks("retiring") })).toContain("names the tracks replacing it");
    expect(errorsFor({ ...minimal(), tracks: tracks("active", ["new"]) })).toContain("only a retiring track");
    expect(errorsFor({ ...minimal(), tracks: tracks("retiring", ["new"]) })).toBe("");
  });

  it("a track that refers to itself", () => {
    expect(
      errorsFor({ ...minimal(), tracks: [{ id: "web", kind: "web", status: "active", uses: ["web"] }] }),
    ).toContain("cannot refer to itself");
  });

  it("a jurisdiction that is neither an ISO 3166 code nor a zone id", () => {
    expect(errorsFor({ ...minimal(), compliance: { jurisdictions: ["Nigeria"] } })).toContain("ISO 3166");
    expect(errorsFor({ ...minimal(), compliance: { jurisdictions: ["NG", "US-CA", "AE-DU", "eu", "difc"] } })).toBe("");
  });

  it("an unknown trait, a malformed rule id, and an exception with no one who decided", () => {
    expect(errorsFor({ ...minimal(), project: { name: "Test", traits: ["money", "crypto"] } })).toContain(
      "project.traits.1:",
    );
    expect(
      errorsFor({ ...minimal(), standards: { overrides: { "react-size": { value: 200, reason: "Forms" } } } }),
    ).toContain("standards.overrides.react-size: Invalid key in record");
    expect(
      errorsFor({ ...minimal(), standards: { exceptions: [{ rule: "SEC-07", reason: "Public catalogue" }] } }),
    ).toContain("standards.exceptions.0.decidedBy:");
    expect(
      errorsFor({
        ...minimal(),
        project: { name: "Test", traits: ["money", "offline"] },
        standards: {
          overrides: { "REACT-04": { value: 200, reason: "Form screens hold many fields" } },
          exceptions: [
            { rule: "SEC-07", reason: "The catalogue is public", decidedBy: "@maintainer", until: "2027-01-31" },
          ],
        },
      }),
    ).toBe("");
  });

  it("says where each problem is", () => {
    expect(errorsFor({ ...minimal(), tracks: [{ id: "Web App", kind: "web", status: "active" }] })).toContain(
      "tracks.0.id:",
    );
  });
});
