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

  it("leave out a rule the project set aside, and say why", () => {
    const standards = standardsFor(
      config({}, { exceptions: [{ rule: "CODE-04", reason: "Generated code", decidedBy: "@maintainer" }] }),
      "/repo",
      "apps/web/src/cart.tsx",
    );
    expect(standards?.peerAiRules.map((rule) => rule.id)).not.toContain("CODE-04");
    expect(standards?.setAside).toEqual([{ rule: "CODE-04", reason: "Generated code" }]);
  });
});
