import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { checkWorkflowScope } from "./ci-scope.ts";
import { diagnose } from "./doctor.ts";
import { GATE_FILE, gateWorkflow } from "./gate.ts";
import { cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const TWO_PARTS = [
  { id: "web", kind: "web", path: "apps/web", status: "active" },
  { id: "api", kind: "backend", path: "apps/api", status: "active" },
];

/** A shop's config with these parts and anything else, and its own workflows. */
function shop(workflows: Record<string, string>, extra: Record<string, unknown> = {}, tracks: unknown[] = TWO_PARTS) {
  const root = project({
    "peer-ai.config.json": JSON.stringify({ version: 1, project: { name: "Shop" }, tracks, ...extra }),
    ...Object.fromEntries(Object.entries(workflows).map(([name, text]) => [`.github/workflows/${name}`, text])),
  });
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return { root, checks: checkWorkflowScope(root, config) };
}

const CANCELS = `concurrency:
  group: \${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: \${{ github.event_name == 'pull_request' }}
`;

const messages = (checks: { status: string; message: string }[], status = "warn") =>
  checks.filter((check) => check.status === status).map((check) => check.message);

describe("doctor on where a project's CI runs its checks (RFC 0022)", () => {
  it("warns about a deployment on pull requests, but not one meant for them or given a condition", () => {
    const { checks } = shop(
      {
        "release.yml": `on: [push, pull_request]
${CANCELS}jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy.sh
  worker:
    runs-on: ubuntu-latest
    steps:
      - run: npx wrangler deploy
  site:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy.sh
  preview:
    runs-on: ubuntu-latest
    environment: preview
    steps:
      - uses: amondnet/vercel-action@v25
  tests:
    runs-on: ubuntu-latest
    environment: ci-secrets
    steps:
      - run: npm test
`,
        "nightly.yml": `on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy.sh
`,
      },
      {},
      [TWO_PARTS[0]],
    );
    expect(messages(checks)).toEqual([
      ".github/workflows/release.yml deploys on pull requests: deploy, worker. What a deployment checks isn't there until the change is released, so it fails, or ships work that hasn't merged.",
    ]);
    expect(checks[0]?.fix).toContain("Run it on a push to the default branch, a tag, or by hand");
  });

  it("warns about a workflow on pull requests that doesn't cancel the run a newer push replaced", () => {
    const job = "jobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run lint\n";
    const { checks } = shop(
      {
        "lint.yml": `on: pull_request\n${job}`,
        "kept.yml": `on: pull_request\nconcurrency:\n  group: lint\n  cancel-in-progress: false\n${job}`,
        "cancels.yml": `on: pull_request\n${CANCELS}${job}`,
        "by-job.yml": `on: pull_request\njobs:\n  lint:\n    concurrency: { group: lint, cancel-in-progress: true }\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run lint\n`,
        "pushes.yml": `on:\n  push:\n    branches: [main]\n${job}`,
      },
      {},
      [TWO_PARTS[0]],
    );
    expect(messages(checks)).toEqual([
      ".github/workflows/kept.yml keeps running a pull request's checks after a newer push replaces them.",
      ".github/workflows/lint.yml keeps running a pull request's checks after a newer push replaces them.",
    ]);
    expect(checks.find((check) => check.status === "warn")?.fix).toContain(
      "with group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }} and cancel-in-progress: ${{ github.event_name == 'pull_request' }}.",
    );
  });

  it("warns when a part's jobs run on every pull request, whatever it changed", () => {
    const jobs = `${CANCELS}jobs:
  web-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - run: npm test
  server:
    runs-on: ubuntu-latest
    steps:
      - run: cd apps/api && npm test
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
`;
    const { checks } = shop({ "ci.yml": `on: pull_request\n${jobs}` });
    expect(messages(checks)).toEqual([
      ".github/workflows/ci.yml runs web-tests (web), server (api) on every pull request, whatever it changed.",
    ]);
    expect(checks[0]?.fix).toContain("Call .github/workflows/peer-ai-changes.yml first");

    // A paths filter, the what-changed workflow, or a project of one part: nothing to say.
    const filtered = shop({ "ci.yml": `on:\n  pull_request:\n    paths: [apps/**]\n${jobs}` });
    expect(messages(filtered.checks)).toEqual([]);
    const scoped = shop({
      "ci.yml": `on: pull_request
${CANCELS}jobs:
  changes:
    uses: ./.github/workflows/peer-ai-changes.yml
  web-tests:
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: cd apps/web && npm test
`,
    });
    expect(messages(scoped.checks)).toEqual([]);
    expect(messages(shop({ "ci.yml": `on: pull_request\n${jobs}` }, {}, [TWO_PARTS[0]]).checks)).toEqual([]);
  });

  it("says nothing about a workflow declined with why, and lists it", () => {
    const { checks } = shop(
      {
        "deploy.yml":
          "on: pull_request\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    environment: staging\n    steps:\n      - run: ./deploy.sh\n",
      },
      {
        declined: [{ workflow: ".github/workflows/deploy.yml", reason: "Staging is rebuilt for each pull request." }],
      },
    );
    expect(checks).toEqual([
      {
        id: "ci-scope",
        status: "ok",
        message: ".github/workflows/deploy.yml runs as it does on purpose: Staging is rebuilt for each pull request.",
      },
    ]);
  });

  it("reads only the project's own workflows, says when they're fine, and never fails doctor", () => {
    const fine = shop(
      {
        "ci.yml": `on: pull_request\n${CANCELS}jobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n`,
      },
      {},
      [TWO_PARTS[0]],
    );
    expect(fine.checks).toEqual([
      {
        id: "ci-scope",
        status: "ok",
        message:
          "1 workflow of your own read: none deploys on pull requests, leaves replaced runs running, or runs a part's jobs whatever changed.",
      },
    ]);
    // Peer AI's own gate isn't the project's to change.
    const { config } = loadConfig(fine.root);
    if (config === undefined) throw new Error("the test config is not valid");
    const own = shop({ [GATE_FILE.split("/").pop() ?? ""]: gateWorkflow(config) });
    expect(own.checks).toEqual([]);

    const noisy = shop({
      "ci.yml":
        "on: pull_request\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    environment: production\n    steps:\n      - run: ./deploy.sh\n",
    });
    const diagnosis = diagnose(noisy.root);
    expect(diagnosis.checks.filter((check) => check.id === "ci-scope").map((check) => check.status)).toEqual([
      "warn",
      "warn",
    ]);
    expect(diagnosis.checks.filter((check) => check.id === "ci-scope" && check.status === "fail")).toEqual([]);
  });
});
