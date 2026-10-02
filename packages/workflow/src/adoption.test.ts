import { describe, expect, it } from "vitest";
import { adoptionOf, reportsOnly } from "./adoption.ts";
import { validateConfig } from "./index.ts";

const config = (standards: Record<string, unknown>) => {
  const result = validateConfig({
    version: 1,
    project: { name: "Shop" },
    tracks: [{ id: "web", kind: "web", status: "active" }],
    standards,
  });
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.value;
};

const TODAY = new Date("2026-10-02T09:00:00Z");
const open = (ids: Record<string, boolean>) => (id: string) => ids[id];

describe("adopting enforcement (RFC 0011)", () => {
  it("reports for the whole project in the report stage, and blocks by default", () => {
    expect(reportsOnly(adoptionOf(config({ enforcement: "report" }), TODAY, open({})), "GHA-01")).toBe(true);
    expect(reportsOnly(adoptionOf(config({}), TODAY, open({})), "GHA-01")).toBe(false);
  });

  it("reports a deferred rule until its date or its work item, then blocks again", () => {
    const adoption = adoptionOf(
      config({
        deferred: [
          { rule: "GHA-03", until: "2026-10-03", reason: "After the demo.", decidedBy: "Ada Obi" },
          { rule: "GHA-05", until: "2026-10-02", reason: "Ends today.", decidedBy: "Ada Obi" },
          { rule: "GHA-02", untilItem: "SHOP-41", reason: "Fix the advisories first.", decidedBy: "Ada Obi" },
          { rule: "GHA-04", untilItem: "SHOP-40", reason: "Done already.", decidedBy: "Ada Obi" },
          { rule: "GHA-01", untilItem: "SHOP-99", reason: "No such item.", decidedBy: "Ada Obi" },
        ],
      }),
      TODAY,
      open({ "SHOP-41": true, "SHOP-40": false }),
    );
    expect([...adoption.deferred.keys()]).toEqual(["GHA-03", "GHA-02"]);
    expect(adoption.ended.map((deferral) => deferral.rule)).toEqual(["GHA-05", "GHA-04", "GHA-01"]);
    expect(reportsOnly(adoption, "GHA-03")).toBe(true);
    expect(reportsOnly(adoption, "GHA-05")).toBe(false);
  });

  it("knows the rules the project's own tools cover", () => {
    const adoption = adoptionOf(
      config({ coveredBy: [{ rule: "GHA-02", by: ".github/workflows/ci.yml", reason: "Trivy scans them." }] }),
      TODAY,
      open({}),
    );
    expect(adoption.coveredBy.get("GHA-02")?.by).toBe(".github/workflows/ci.yml");
  });

  it("needs a deferral to say when it ends, one way", () => {
    expect(() => config({ deferred: [{ rule: "GHA-03", reason: "x", decidedBy: "y" }] })).toThrow("until");
    expect(() =>
      config({ deferred: [{ rule: "GHA-03", until: "2026-11-01", untilItem: "SHOP-1", reason: "x", decidedBy: "y" }] }),
    ).toThrow("until");
  });
});
