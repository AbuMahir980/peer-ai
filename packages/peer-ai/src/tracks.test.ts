import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { evaluate } from "./check.ts";
import { diagnose } from "./doctor.ts";
import { runRender } from "./render.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";
import { advanceWorkItem, createWorkItem, updateWorkItem } from "./work.ts";
import { runWork } from "./work-command.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-03T09:00:00Z");
const config = (web: Record<string, unknown> | undefined) =>
  JSON.stringify({
    version: 1,
    project: { name: "Shop", stage: "mvp" },
    tools: ["claude-code"],
    tracks: [
      { id: "api", kind: "backend", path: "services/api", status: "active" },
      ...(web === undefined ? [] : [{ id: "web", kind: "web", path: "apps/web", ...web }]),
    ],
    tracker: { kind: "linear", ticketPrefix: "SHOP" },
  });
const loaded = (root: string): PeerAiConfig => {
  const { config: read } = loadConfig(root);
  if (read === undefined) throw new Error("the test config is not valid");
  return read;
};

/** A shop whose web app had an open item when the app was retired, or removed from the config. */
function retired(web: Record<string, unknown> | undefined): { root: string; config: PeerAiConfig } {
  const root = project({
    "peer-ai.config.json": config({ status: "active" }),
    "services/api/main.py": "",
    "apps/web/index.ts": "",
  });
  const created = createWorkItem(root, loaded(root), { title: "Cart", kind: "feature", track: "web" }, NOW);
  if (!created.ok) throw new Error(created.error);
  writeFileSync(join(root, "peer-ai.config.json"), config(web));
  return { root, config: loaded(root) };
}

describe("a retired part of the project (RFC 0017)", () => {
  it("needs no folder, is said as retired, and keeps its items readable and movable", () => {
    const { root, config: shop } = retired({ status: "retired" });
    expect(diagnose(root, "24.3.0").checks.filter((check) => check.id === "tracks" && check.status === "fail")).toEqual(
      [],
    );
    runRender({ cwd: root, check: false, quiet: true }, capture());
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toContain(
      "- `web` (web, retired): no longer part of the product",
    );
    expect(diagnose(root, "24.3.0").checks).toContainEqual({
      id: "work-items",
      status: "warn",
      message: 'SHOP-1 is open on the track "web", which is retired.',
      fix: "Move it to another track, with update_work_item or npx peer-ai work move SHOP-1 <track>, or cancel it.",
    });
    const refused = createWorkItem(root, shop, { title: "More cart", kind: "feature", track: "web" }, NOW);
    expect(refused.ok ? "" : refused.error).toBe('The track "web" is retired. The tracks are: api.');
    const out = capture();
    expect(runWork({ cwd: root, action: "move", args: ["SHOP-1", "api"], now: NOW }, out)).toBe(0);
    expect(out.text()).toContain("SHOP-1 is on the track api.");
  });

  it("never stops an item on a removed track from being cancelled, and the gate only warns", () => {
    const { root, config: shop } = retired(undefined);
    const cancelled = advanceWorkItem(root, shop, "SHOP-1", "cancelled", NOW);
    expect(cancelled.ok ? cancelled.value.stage : cancelled.error).toBe("cancelled");
    expect(evaluate(root, shop).checks.filter((check) => check.id === "work-items" && check.status === "fail")).toEqual(
      [],
    );
  });

  it("is refused as a track to move an item to", () => {
    const { root, config: shop } = retired({ status: "retired" });
    const moved = updateWorkItem(root, shop, "SHOP-1", { track: "web", next: "Go on" }, NOW);
    expect(moved.ok ? moved.value.next : moved.error).toBe("Go on");
    const elsewhere = updateWorkItem(root, shop, "SHOP-1", { track: "mobile" }, NOW);
    expect(elsewhere.ok ? "" : elsewhere.error).toBe('There is no track "mobile". The tracks are: api.');
    expect(runWork({ cwd: root, action: "move", args: ["SHOP-1"] }, capture())).toBe(2);
  });
});
