// assess on every project shape Peer AI supports. Each example config in @peer-ai/workflow is one
// shape; this checks that assess reads it the way that shape means, so a change that breaks one
// fails here before it reaches a real project.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assess, gaps, loadConfig, type Assessment } from "./assess.ts";
import { cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const EXAMPLES = join(import.meta.dirname, "..", "..", "workflow", "examples");
const SHAPES = readdirSync(EXAMPLES)
  .filter((file) => file.endsWith(".config.json"))
  .map((file) => file.slice(0, -".config.json".length));

/** A project of this shape, with its example config and the given files. */
function assessed(shape: string, files: Record<string, string> = {}): Assessment {
  const root = project({
    "peer-ai.config.json": readFileSync(join(EXAMPLES, `${shape}.config.json`), "utf8"),
    ...files,
  });
  const { config, errors } = loadConfig(root);
  if (config === undefined) throw new Error(`${shape}: ${(errors ?? []).join("; ")}`);
  return assess(root, config, config.project.stage ?? "mvp");
}

const status = (result: Assessment, item: keyof Assessment["items"]) => result.items[item].status;

describe("assess on every project shape", () => {
  it("has a test for every example shape", () => {
    expect(SHAPES.sort()).toEqual([
      "existing-mobile-app",
      "frontend-only",
      "informal-prototype",
      "local-first-app",
      "microservices",
      "multi-app-mobile",
      "web-app-with-api",
    ]);
  });

  it("asks nothing of an informal prototype", () => {
    const result = assessed("informal-prototype");
    expect(gaps(result, "prototype")).toEqual([]);
    expect(status(result, "api-contract")).toBe("not-applicable");
  });

  it("leaves a separate backend's contract and data to its own repository, and finds the frontend's design at its link", () => {
    const result = assessed("frontend-only");
    expect(result.items["api-contract"]).toMatchObject({
      status: "not-applicable",
      note: "Provided by another repository, where its contract lives: clinic-api.",
    });
    expect(status(result, "data-model")).toBe("not-applicable");
    expect(result.items.design).toEqual({ status: "present", evidence: ["https://design.clearwell.example/portal"] });
    expect(result.tracks.map((track) => track.id)).toEqual(["portal", "clinic-backend"]);
  });

  it("asks a web app with its own API for the contract, and finds it where the config says", () => {
    expect(status(assessed("web-app-with-api"), "api-contract")).toBe("missing");
    expect(status(assessed("web-app-with-api", { "docs/api-contract.md": "# Contract" }), "api-contract")).toBe(
      "present",
    );
  });

  it("checks tests service by service, and doesn't ask a retiring service for them", () => {
    const result = assessed("microservices", {
      "services/orders/tests/test_orders.py": "",
      "services/orders/pyproject.toml": "",
      "infra/main.tf": "",
    });
    expect(result.items.tests).toMatchObject({
      status: "partial",
      note: "Tests in 1 of 4 parts; none in: dashboard, payments, notifications.",
    });
    expect(status(result, "infrastructure")).toBe("present");
  });

  it("asks several mobile apps with a shared backend for a design and a data model", () => {
    const result = assessed("multi-app-mobile", { "apps/shopper/src/cart.test.ts": "" });
    expect(status(result, "design")).toBe("missing");
    expect(status(result, "data-model")).toBe("missing");
    expect(result.items.tests.note).toBe("Tests in 1 of 4 parts; none in: vendor-app, core, backend.");
  });

  it("checks a frozen backend's tests in an existing app, but not the app being retired", () => {
    const result = assessed("existing-mobile-app", { "apps/mobile/src/home.test.ts": "" });
    expect(result.items.tests.note).toBe("Tests in 1 of 2 parts; none in: backend.");
  });

  it("creates no requirements for a part that hasn't started, such as a local-first app's future sync", () => {
    const result = assessed("local-first-app");
    expect(status(result, "data-model")).toBe("not-applicable");
    expect(status(result, "api-contract")).toBe("missing");
    expect(status(assessed("local-first-app", { "src/core/repository.ts": "" }), "api-contract")).toBe("present");
  });
});
