import type { PeerAiConfig } from "peer-ai-workflow";
import { describe, expect, it } from "vitest";
import { standardsFor } from "./standards.ts";

const config = (
  project: Partial<PeerAiConfig["project"]> = {},
  standards?: PeerAiConfig["standards"],
): PeerAiConfig => ({
  version: 1,
  project: { name: "Shop", stage: "mvp", ...project },
  tracks: [
    { id: "web", kind: "web", path: "apps/web", status: "active" },
    { id: "api", kind: "backend", path: "services/api", status: "active" },
  ],
  ...(standards === undefined ? {} : { standards }),
});

const ids = (c: PeerAiConfig, file = "apps/web/src/cart.tsx") =>
  (standardsFor(c, "/repo", file)?.peerAiRules ?? []).map((rule) => rule.id);

describe("the rules for a file", () => {
  it("are the ones that apply at the project's stage", () => {
    const prototype = ids(config({ stage: "prototype" }));
    const mvp = ids(config({ stage: "mvp" }));
    expect(prototype).toContain("CODE-11");
    expect(prototype).not.toContain("CODE-07");
    expect(mvp).toContain("CODE-07");
  });

  it("include the money rules only for a product with the money trait", () => {
    expect(ids(config()).some((id) => id.startsWith("MONEY-"))).toBe(false);
    expect(ids(config({ traits: ["money"] }))).toContain("MONEY-01");
  });

  it("include the offline rules for an app that works offline", () => {
    expect(ids(config())).not.toContain("REL-09");
    expect(ids(config({ traits: ["offline"] }))).toEqual(expect.arrayContaining(["REL-01", "REL-08", "REL-09"]));
  });

  it("leave out a rule the project set aside, and say why", () => {
    const standards = standardsFor(
      config({}, { exceptions: [{ rule: "CODE-04", reason: "Generated code", decidedBy: "@maintainer" }] }),
      "/repo",
      "apps/web/src/cart.tsx",
    );
    expect(standards?.peerAiRules.map((rule) => rule.id)).not.toContain("CODE-04");
    expect(standards?.setAside).toEqual([{ rule: "CODE-04", reason: "Generated code" }]);
  });

  it("add the stack profiles' rules for the file's part, with the project's values", () => {
    const listed: PeerAiConfig = {
      ...config({}, { profiles: ["typescript"], overrides: { "TS-06": { value: 4, reason: "Deeper booking rules" } } }),
      tracks: [
        { id: "web", kind: "web", path: "apps/web", status: "active", stack: ["typescript", "react"] },
        { id: "api", kind: "backend", path: "services/api", status: "active", stack: ["python", "fastapi"] },
      ],
    };
    const web = standardsFor(listed, "/repo", "apps/web/src/cart.tsx")?.peerAiRules ?? [];
    expect(web.find((rule) => rule.id === "TS-06")).toEqual({
      id: "TS-06",
      title: "Nesting stays 4 levels deep or less",
      severity: expect.any(String) as unknown,
      value: 4,
    });
    expect(standardsFor(listed, "/repo", "apps/web/src/cart.tsx", ["TS-06"])?.peerAiRules).toEqual([
      expect.objectContaining({ id: "TS-06", carries: "CODE-09", value: 4, ask: expect.any(String) as unknown }),
    ]);
    expect(ids(listed, "services/api/app/main.py").some((id) => id.startsWith("TS-"))).toBe(false);
    expect(ids(config())).not.toContain("TS-02");
  });

  it("give the pipeline's rules to its files in .github/, even in a project that's one part, and not to the code", () => {
    const pipeline: PeerAiConfig = {
      ...config({}, { profiles: ["github-actions"] }),
      tracks: [{ id: "app", kind: "web", status: "active" }],
    };
    expect(ids(pipeline, ".github/workflows/ci.yml")).toEqual(expect.arrayContaining(["GHA-01", "GHA-03", "GHA-05"]));
    expect(ids(pipeline, "src/cart.tsx").some((id) => id.startsWith("GHA-"))).toBe(false);
  });
});

describe("rules that fit what the file is (RFC 0012)", () => {
  const trips: PeerAiConfig = {
    ...config({}, { profiles: ["python-fastapi", "react-native", "typescript", "github-actions"] }),
    tracks: [
      { id: "api", kind: "backend", path: "services/api", status: "active", stack: ["python", "fastapi"] },
      { id: "mobile", kind: "mobile", path: "apps/mobile", status: "active" },
    ],
    docs: { dir: "handbook" },
  };
  const kindOf = (file: string) => standardsFor(trips, "/repo", file)?.kind;
  const prefixes = (file: string) => new Set(ids(trips, file).map((id) => id.split("-")[0]));

  it("work out the file's kind from its path", () => {
    expect(kindOf(".github/workflows/ci.yml")).toBe("ci-pipeline");
    expect(kindOf("Makefile")).toBe("build");
    expect(kindOf("services/api/Dockerfile")).toBe("build");
    expect(kindOf("infra/main.tf")).toBe("infrastructure");
    expect(kindOf("services/api/requirements.txt")).toBe("dependencies");
    expect(kindOf("services/api/alembic/versions/0007_tenant.py")).toBe("data-schema");
    expect(kindOf("services/api/tests/test_trips.py")).toBe("test");
    expect(kindOf("docs/register.md")).toBe("document");
    expect(kindOf("handbook/onboarding.html")).toBe("document");
    expect(kindOf(".gitleaks.toml")).toBe("tool-settings");
    expect(kindOf("apps/mobile/src/screens/Trip.tsx")).toBe("source");
  });

  it("give a file of a known kind its kind's rules, wherever it is", () => {
    expect(prefixes(".github/workflows/ci.yml")).toEqual(new Set(["SEC", "DEL", "GHA"]));
    expect(prefixes("docs/register.md")).toEqual(new Set());
    // A Dockerfile in a part still gets the delivery rules its part's kind doesn't have.
    expect(prefixes("services/api/Dockerfile").has("DEL")).toBe(true);
    expect(prefixes("services/api/Dockerfile").has("API")).toBe(false);
  });

  it("give a dependency manifest the delivery rules for its dependencies, not the code's (#224)", () => {
    for (const manifest of ["apps/mobile/package.json", "package.json", "services/api/requirements.txt"]) {
      const found = ids(trips, manifest);
      for (const rule of ["DEL-01", "DEL-02", "DEL-03", "DEL-09", "DEL-11"]) expect(found).toContain(rule);
      expect(found.some((id) => /^(TS|REACT|RN|CODE)-/.test(id))).toBe(false);
    }
  });

  it("keep each profile to the files of its language, even in a part that names no stack (#113)", () => {
    const screen = prefixes("apps/mobile/src/screens/Trip.tsx");
    expect(screen.has("RN")).toBe(true);
    expect(screen.has("PY")).toBe(false);
    expect(screen.has("FASTAPI")).toBe(false);
    expect(screen.has("GHA")).toBe(false);
    expect(prefixes("services/api/app/main.py").has("TS")).toBe(false);
    expect(prefixes("services/api/app/main.py").has("PY")).toBe(true);
  });

  it("come in brief, with the full text of the ids asked for, and say which don't apply", () => {
    const brief = standardsFor(trips, "/repo", ".github/workflows/ci.yml");
    expect(Object.keys(brief?.peerAiRules[0] ?? {}).sort()).toEqual(["id", "severity", "title"]);
    expect(JSON.stringify(brief).length).toBeLessThan(5_000);
    const full = standardsFor(trips, "/repo", ".github/workflows/ci.yml", ["GHA-03", "RN-01"]);
    expect(full?.peerAiRules).toEqual([
      expect.objectContaining({
        id: "GHA-03",
        rule: expect.any(String) as unknown,
        why: expect.any(String) as unknown,
      }),
    ]);
    expect(full?.notApplicable).toEqual(["RN-01"]);
  });
});
