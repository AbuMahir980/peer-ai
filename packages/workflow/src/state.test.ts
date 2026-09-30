import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMap, validateWorkItem } from "./index.ts";

const stateDir = join(import.meta.dirname, "..", "examples", ".peer-ai");
const read = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(stateDir, path), "utf8")) as Record<string, unknown>;

const errors = (result: { ok: true } | { ok: false; errors: string[] }): string =>
  result.ok ? "" : result.errors.join("\n");

describe("the project map", () => {
  const map = () => read("map.json");
  const at = "2026-10-02T09:15:00Z";

  it("accepts the example", () => {
    expect(errors(validateMap(map()))).toBe("");
  });

  it("requires evidence for anything present or partial", () => {
    const input = { ...map(), items: { ci: { status: "present", checkedAt: at } } };
    expect(errors(validateMap(input))).toContain("a present item needs evidence");
  });

  it("requires a reason when an item does not apply", () => {
    const input = { ...map(), items: { slos: { status: "not-applicable", checkedAt: at } } };
    expect(errors(validateMap(input))).toContain("say why");
  });

  it("accepts an item inferred from the code, and the data inventory", () => {
    const input = {
      ...map(),
      items: {
        architecture: { status: "present", evidence: ["src/"], inferred: true, checkedAt: at },
        "data-inventory": { status: "missing", checkedAt: at },
      },
    };
    expect(errors(validateMap(input))).toBe("");
  });

  it("rejects an unknown item unless it is marked custom with x-", () => {
    expect(errors(validateMap({ ...map(), items: { tests2: { status: "missing", checkedAt: at } } }))).not.toBe("");
    expect(errors(validateMap({ ...map(), items: { "x-tests2": { status: "missing", checkedAt: at } } }))).toBe("");
  });
});

describe("a work item", () => {
  const item = () => read("work/HBL-7.json");

  it("accepts the example", () => {
    expect(errors(validateWorkItem(item()))).toBe("");
  });

  it("keeps next to one line, since the fuller story lives in the goal, acceptance criteria and sources", () => {
    expect(errors(validateWorkItem({ ...item(), next: "x".repeat(201) }))).toContain("next:");
  });

  it("rejects an activity that is not in the list", () => {
    const input = { ...item(), activities: [{ id: "frontend-build", status: "done" }] };
    expect(errors(validateWorkItem(input))).toContain("activities.0.id:");
  });

  it("needs a reason for a skipped activity", () => {
    const input = { ...item(), activities: [{ id: "contract", status: "skipped" }] };
    expect(errors(validateWorkItem(input))).toContain("a skipped activity needs a reason");
  });

  it("ties a gap work item to the map item it fills, and only a gap item", () => {
    expect(errors(validateWorkItem({ ...item(), kind: "gap" }))).toContain("names the map item it fills");
    expect(errors(validateWorkItem({ ...item(), kind: "gap", gap: "threat-model" }))).toBe("");
    expect(errors(validateWorkItem({ ...item(), gap: "threat-model" }))).toContain("only a gap work item");
  });

  it("uses an id that is safe as a file name", () => {
    expect(errors(validateWorkItem({ ...item(), id: "#42" }))).toContain("id:");
  });

  it("requires timestamps with a timezone", () => {
    expect(errors(validateWorkItem({ ...item(), updatedAt: "2026-10-03 14:21" }))).toContain("updatedAt:");
  });
});
