import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WorkItem } from "peer-ai-workflow";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { loadConfig } from "./assess.ts";
import type { Runner } from "./feedback.ts";
import { openPullRequests, pullRequestState, type OpenPullRequest } from "./pull-requests.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { createWorkItem, nextWork } from "./work.ts";

afterEach(cleanUp);

const COMMIT = "4f2a9c1".padEnd(40, "0");
const item = (stage: WorkItem["stage"]) => ({ id: "SHOP-1", stage }) as WorkItem;
const pull = (checks: OpenPullRequest["checks"]): OpenPullRequest => ({
  number: 12,
  url: "https://github.com/example/shop/pull/12",
  branch: "feature/SHOP-1-cart",
  commit: COMMIT,
  checks,
});

/** gh as GitHub would answer `gh pr list`, for one pull request with these checks. */
const gitHub =
  (rollup: unknown[]): Runner =>
  (_command, args) =>
    args[0] === "pr"
      ? JSON.stringify([
          {
            number: 12,
            url: "https://github.com/example/shop/pull/12",
            headRefName: "feature/SHOP-1-cart",
            headRefOid: COMMIT,
            statusCheckRollup: rollup,
          },
        ])
      : undefined;

describe("CI in view (RFC 0020)", () => {
  it("makes a failing check the next thing to do, and the gate's red waiting while the item is short of ship", () => {
    const tests = { name: "integration-tests", state: "fail" as const, url: "https://ci.example/1" };
    const gate = { name: "peer-ai check", state: "fail" as const };
    expect(pullRequestState(item("build"), pull([tests, gate]))).toMatchObject({
      checks: "failing",
      failing: [{ name: "integration-tests", url: "https://ci.example/1" }],
      next: "Fix CI: integration-tests, on 4f2a9c1.",
    });
    expect(pullRequestState(item("build"), pull([gate])).checks).toBe("waiting");
    expect(pullRequestState(item("ship"), pull([gate]))).toMatchObject({
      checks: "failing",
      next: "Fix CI: peer-ai check, on 4f2a9c1.",
    });
    expect(pullRequestState(item("build"), pull([{ name: "lint", state: "pending" }])).checks).toBe("pending");
    expect(pullRequestState(item("build"), pull([{ name: "lint", state: "pass" }])).checks).toBe("passing");
  });

  it("reads check runs and commit statuses from gh, and nothing when gh can't be asked", () => {
    const root = mkdtempSync(join(tmpdir(), "peer-ai-pulls-"));
    const runs = gitHub([
      {
        __typename: "CheckRun",
        name: "integration-tests",
        status: "COMPLETED",
        conclusion: "FAILURE",
        detailsUrl: "https://ci.example/1",
      },
      { __typename: "CheckRun", name: "lint", status: "IN_PROGRESS", conclusion: null },
      {
        __typename: "StatusContext",
        context: "deploy-preview",
        state: "SUCCESS",
        targetUrl: "https://preview.example",
      },
    ]);
    expect(openPullRequests(root, runs, Date.now(), false)?.[0]?.checks).toEqual([
      { name: "integration-tests", state: "fail", url: "https://ci.example/1" },
      { name: "lint", state: "pending" },
      { name: "deploy-preview", state: "pass", url: "https://preview.example" },
    ]);
    expect(openPullRequests(root, () => undefined, Date.now(), false)).toBeUndefined();
  });

  it("shows each open item's checks in next_work, with a failing one as its next action", () => {
    const cache = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = mkdtempSync(join(tmpdir(), "peer-ai-cache-"));
    onTestFinished(() => {
      if (cache === undefined) delete process.env.XDG_CACHE_HOME;
      else process.env.XDG_CACHE_HOME = cache;
    });
    const root = project(
      {
        "peer-ai.config.json": JSON.stringify({
          version: 1,
          project: { name: "Shop", stage: "mvp" },
          tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
          tracker: { kind: "linear", ticketPrefix: "SHOP" },
        }),
      },
      { gitRemote: "https://github.com/example/shop.git" },
    );
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    const created = createWorkItem(
      root,
      config,
      { title: "Cart", kind: "feature", branch: "feature/SHOP-1-cart" },
      new Date("2026-10-13T09:00:00Z"),
    );
    if (!created.ok) throw new Error(created.error);
    const failing = gitHub([
      { __typename: "CheckRun", name: "integration-tests", status: "COMPLETED", conclusion: "FAILURE" },
    ]);
    const work = nextWork(root, config, "feature/SHOP-1-cart", failing);
    expect(work.open[0]).toMatchObject({
      ci: "failing: integration-tests",
      next: "Fix CI: integration-tests, on 4f2a9c1.",
    });
    expect(work.pullRequest).toMatchObject({ number: 12, checks: "failing" });
    // Without gh, or before asking, nothing changes.
    expect(nextWork(root, config, "feature/SHOP-1-cart").open[0]).not.toHaveProperty("ci");
  });
});
