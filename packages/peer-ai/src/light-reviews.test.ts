import type { PeerAiConfig, WorkItem } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { assess, loadConfig } from "./assess.ts";
import { gateWorkItem } from "./check.ts";
import type { ChangeSizes } from "./commits.ts";
import { reviewsFor } from "./routing.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";
import { createWorkItem, loadWorkItem, saveWorkItem, updateWorkItem } from "./work.ts";
import { runWaive } from "./work-command.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-03T09:00:00Z");
const config = (stage = "mvp"): PeerAiConfig => ({
  version: 1,
  project: { name: "Shop", stage: stage as "mvp" },
  tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
});
const sizes = (lines: Record<string, number>, added: string[] = []): ChangeSizes => ({
  lines: new Map(Object.entries(lines)),
  added: new Set(added),
});
const depths = (files: string[], changed: ChangeSizes) =>
  Object.fromEntries(
    reviewsFor(files, config(), "mvp", () => "", undefined, {}, changed).map((review) => [
      review.skill,
      review.depth ?? "full",
    ]),
  );

describe("a weak trigger asks for a light review (RFC 0016)", () => {
  it("is a few changed lines in files the change didn't add, about nothing sensitive", () => {
    const screen = ["apps/web/src/Cart.tsx"];
    expect(depths(screen, sizes({ "apps/web/src/Cart.tsx": 2 }))).toEqual({
      "code-review": "light",
      "security-review": "light",
      "accessibility-review": "light",
    });
    expect(depths(screen, sizes({ "apps/web/src/Cart.tsx": 40 }))["accessibility-review"]).toBe("full");
    expect(depths(screen, sizes({ "apps/web/src/Cart.tsx": 2 }, screen))["accessibility-review"]).toBe("full");
    const session = ["apps/web/src/session.ts"];
    expect(depths(session, sizes({ "apps/web/src/session.ts": 1 }))["security-review"]).toBe("full");
    expect(reviewsFor(screen, config(), "mvp", () => "")[0]?.depth).toBeUndefined();
  });
});

describe("the gate, with light reviews and waivers (RFC 0016)", () => {
  function shipping(stage: string, extra: Partial<WorkItem>): { root: string; config: PeerAiConfig; item: WorkItem } {
    const root = project({ "peer-ai.config.json": JSON.stringify(config(stage)) });
    const { config: loaded } = loadConfig(root);
    if (loaded === undefined) throw new Error("the test config is not valid");
    const created = createWorkItem(root, loaded, { id: "SHOP-1", title: "Cart", kind: "feature" }, NOW);
    if (!created.ok) throw new Error(created.error);
    const saved = saveWorkItem(root, loaded, {
      ...created.value,
      stage: "ship",
      lastVerify: { result: "pass", at: NOW.toISOString() },
      ...extra,
    });
    if (!saved.ok) throw new Error(saved.error);
    return { root, config: loaded, item: saved.value };
  }
  const failures = (root: string, shop: PeerAiConfig, item: WorkItem) =>
    gateWorkItem(item, shop, shop.project.stage ?? "mvp", assess(root, shop, "mvp"), [], { moving: "ship" })
      .filter((check) => check.status === "fail")
      .map((check) => check.message);
  const review = (depth?: "light") => ({
    skill: "accessibility-review" as const,
    result: "pass" as const,
    at: NOW.toISOString(),
    ...(depth === undefined ? {} : { depth }),
  });

  it("takes a light review for a light requirement, and only a full one for a full requirement", () => {
    const light = shipping("mvp", {
      requiredReviews: [{ skill: "accessibility-review", reason: "it changes a screen", depth: "light" }],
      reviews: [review("light")],
    });
    expect(failures(light.root, light.config, light.item)).toEqual([]);
    const full = shipping("mvp", {
      requiredReviews: [{ skill: "accessibility-review", reason: "it changes a screen" }],
      reviews: [review("light")],
    });
    expect(failures(full.root, full.config, full.item)).toEqual([
      "SHOP-1 is at ship, but its accessibility-review was a light review, and it needs a full one because it changes a screen.",
    ]);
  });

  it("takes a waiver with why and who decided, and refuses waiving a full review at production", () => {
    const mvp = shipping("mvp", {
      requiredReviews: [{ skill: "accessibility-review", reason: "it changes a screen" }],
    });
    const out = capture();
    expect(
      runWaive(
        {
          cwd: mvp.root,
          id: "SHOP-1",
          skill: "accessibility-review",
          reason: "Only a label's colour token moved.",
          by: "Ada Obi",
          now: NOW,
        },
        out,
      ),
    ).toBe(0);
    const item = loadWorkItem(mvp.root, "SHOP-1");
    if (!item.ok) throw new Error(item.error);
    expect(item.value.waived).toEqual([
      {
        skill: "accessibility-review",
        reason: "Only a label's colour token moved.",
        by: "Ada Obi",
        at: NOW.toISOString(),
      },
    ]);
    expect(failures(mvp.root, mvp.config, item.value)).toEqual([]);

    const production = shipping("production", {
      requiredReviews: [{ skill: "accessibility-review", reason: "it changes a screen" }],
    });
    const refused = updateWorkItem(
      production.root,
      production.config,
      "SHOP-1",
      { waive: { skill: "accessibility-review", reason: "Small.", by: "Ada Obi" } },
      NOW,
    );
    expect(refused.ok ? "" : refused.error).toContain("At the production stage, only a light review can be waived");
  });
});
