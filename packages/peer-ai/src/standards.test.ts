import type { PeerAiConfig } from "@peer-ai/workflow";
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
    expect(web.find((rule) => rule.id === "TS-06")).toMatchObject({
      title: "Nesting stays 4 levels deep or less",
      carries: "CODE-09",
      value: 4,
    });
    expect(ids(listed, "services/api/app/main.py").some((id) => id.startsWith("TS-"))).toBe(false);
    expect(ids(config())).not.toContain("TS-02");
  });
});
