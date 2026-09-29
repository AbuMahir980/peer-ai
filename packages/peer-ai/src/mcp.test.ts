import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MCP_TOOL_IDS } from "@peer-ai/workflow";
import { afterEach, describe, expect, it } from "vitest";
import { evaluate } from "./check.ts";
import { loadConfig } from "./assess.ts";
import { createServer, findRoot } from "./mcp.ts";
import { cleanUp, project } from "./test-helpers.ts";

const NOW = new Date("2026-10-02T09:15:00Z");
const json = (value: unknown) => JSON.stringify(value);
const clients: Client[] = [];

/** A report for a clean review: every rule checked, nothing found. */
const passingReport = (workItem: string) => ({
  version: 1,
  skill: "code-review",
  workItem,
  at: NOW.toISOString(),
  scope: { tracks: ["web"] },
  inputs: ["docs/standards/web.md"],
  inventory: [{ id: "file:apps/web/src/cart.ts", kind: "file" }],
  coverage: [
    { rule: "CODE-TEST-01", item: "file:apps/web/src/cart.ts", status: "pass", evidence: "cart.test.ts covers totals" },
  ],
  findings: [],
  result: "pass",
  summary: "Clean: every rule checked, nothing found.",
});

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  cleanUp();
});

const CONFIG = {
  version: 1,
  project: { name: "Shop", stage: "mvp" },
  tracks: [
    { id: "web", kind: "web", path: "apps/web", status: "active" },
    { id: "api", kind: "backend", path: "services/api", status: "active" },
  ],
  standards: {
    profiles: ["react"],
    documents: [
      { path: "docs/standards/web.md", role: "standard", scope: ["web"] },
      { path: "docs/standards/api.md", role: "standard", scope: ["api"] },
      { path: "docs/standards/all.md", role: "addendum" },
    ],
  },
  commands: { verify: `node -e "console.log('all checks passed')"` },
};

function shop(config: unknown = CONFIG): string {
  return project({
    "peer-ai.config.json": json(config),
    "apps/web/package.json": json({ dependencies: { react: "19.0.0" } }),
    "services/api/requirements.txt": "fastapi\n",
  });
}

async function connect(cwd: string): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([createServer({ cwd, now: () => NOW }).connect(serverSide), client.connect(clientSide)]);
  clients.push(client);
  return client;
}

interface Called {
  isError: boolean;
  text: string;
  value: () => Record<string, unknown>;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<Called> {
  const result = await client.callTool({ name, arguments: args });
  const [first] = result.content as { type: string; text: string }[];
  const text = first?.text ?? "";
  return { isError: result.isError === true, text, value: () => JSON.parse(text) as Record<string, unknown> };
}

describe("the MCP server", () => {
  it("offers the workflow's tools, and tells the agent how to use them", async () => {
    const client = await connect(shop());
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(MCP_TOOL_IDS);
    expect(tools.map((tool) => [tool.name, tool.annotations?.readOnlyHint])).toEqual([
      ["project_map", true],
      ["next_work", true],
      ["standards_for_file", true],
      ["create_work_item", false],
      ["update_work_item", false],
      ["run_verify", false],
      ["record_review", false],
      ["advance_work_item", false],
    ]);
    expect(client.getInstructions()).toContain("Start a session with next_work");
  });

  it("takes a work item from creation to done, and CI agrees with the result", async () => {
    const root = shop();
    const client = await connect(root);
    const created = await call(client, "create_work_item", { title: "Cart totals", kind: "feature", track: "web" });
    expect(created.value()).toMatchObject({ id: "ITEM-1", stage: "prepare" });

    expect((await call(client, "advance_work_item", { id: "ITEM-1" })).value()).toMatchObject({ stage: "build" });
    await call(client, "update_work_item", {
      id: "ITEM-1",
      next: "Run verify",
      position: { activity: "build", step: 3 },
    });
    expect((await call(client, "advance_work_item", { id: "ITEM-1" })).value()).toMatchObject({ stage: "verify" });

    const refused = await call(client, "advance_work_item", { id: "ITEM-1" });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain("ITEM-1 can't move to ship yet");

    const verified = await call(client, "run_verify", { id: "ITEM-1" });
    expect(verified.value()).toMatchObject({ result: "pass", output: "all checks passed\n" });
    const reportPath = ".peer-ai/reports/ITEM-1/code-review.json";
    mkdirSync(join(root, ".peer-ai/reports/ITEM-1"), { recursive: true });
    writeFileSync(join(root, reportPath), json(passingReport("ITEM-1")));
    const reviewed = await call(client, "record_review", { id: "ITEM-1", skill: "code-review", report: reportPath });
    expect(reviewed.value()).toMatchObject({ reviews: [{ skill: "code-review", result: "pass", report: reportPath }] });
    expect((await call(client, "advance_work_item", { id: "ITEM-1", to: "ship" })).value()).toMatchObject({
      stage: "ship",
    });
    expect((await call(client, "advance_work_item", { id: "ITEM-1" })).value()).toMatchObject({ stage: "done" });

    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    expect(evaluate(root, config).checks.filter((check) => check.id === "gates")).toEqual([
      { id: "gates", status: "ok", message: "1 work item at ship or done, each verified and reviewed" },
    ]);
  });

  it("serves the map, the next work and the standards for a file", async () => {
    const root = shop();
    const client = await connect(root);
    const map = (await call(client, "project_map")).value();
    expect(map).toMatchObject({
      project: "Shop",
      stage: "mvp",
      neededFor: { mvp: expect.any(Array) as unknown },
      suggestedTraits: [],
    });
    expect(map.storedMap).toMatch(/^There is no \.peer-ai\/map\.json yet/);
    expect((await call(client, "next_work")).value()).toMatchObject({ open: [], gaps: { stage: "mvp" } });

    const standards = (await call(client, "standards_for_file", { file: "apps/web/src/cart.tsx" })).value();
    expect(standards).toMatchObject({
      file: "apps/web/src/cart.tsx",
      stage: "mvp",
      track: { id: "web", kind: "web", path: "apps/web" },
      core: true,
      profiles: ["react"],
      documents: [
        { path: "docs/standards/web.md", role: "standard" },
        { path: "docs/standards/all.md", role: "addendum" },
      ],
      rules: [],
      precedence: "project",
      setAside: [],
    });
    const ids = (standards.peerAiRules as { id: string }[]).map((rule) => rule.id);
    expect(ids).toContain("ARC-01");
    expect(ids).toContain("CODE-11");
    expect(ids.some((id) => id.startsWith("MONEY-"))).toBe(false);
    const outside = await call(client, "standards_for_file", { file: "../elsewhere/x.ts" });
    expect(outside).toMatchObject({ isError: true, text: "../elsewhere/x.ts is outside the project." });
  });

  it("serves over stdio from the command line, as an AI tool starts it", async () => {
    const client = new Client({ name: "test", version: "0.0.0" });
    clients.push(client);
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [fileURLToPath(new URL("cli.ts", import.meta.url)), "mcp"],
        cwd: shop(),
        stderr: "pipe",
      }),
    );
    expect(client.getServerVersion()).toMatchObject({ name: "peer-ai" });
    const result = await client.callTool({ name: "next_work", arguments: {} });
    expect(result.isError).not.toBe(true);
  });

  it("works from a folder inside the project", async () => {
    const root = shop();
    expect(findRoot(`${root}/apps/web`)).toBe(root);
    const client = await connect(`${root}/apps/web`);
    expect((await call(client, "project_map")).value()).toMatchObject({ project: "Shop" });
  });

  it("refuses with how to fix it when there is no valid config, or the arguments are wrong", async () => {
    const none = await connect(project());
    const withoutConfig = await call(none, "next_work");
    expect(withoutConfig.isError).toBe(true);
    expect(withoutConfig.text).toContain("Run npx peer-ai init in the project first.");

    const invalid = await connect(shop({ version: 1, project: { name: "Shop" }, tracks: [] }));
    expect((await call(invalid, "project_map")).text).toMatch(/^peer-ai\.config\.json is not valid:\n- tracks/);

    const client = await connect(shop());
    const wrongKind = await call(client, "create_work_item", { title: "Epic", kind: "epic" });
    expect(wrongKind.isError).toBe(true);
    expect((await call(client, "record_review", { id: "ITEM-9", skill: "code-review", result: "pass" })).text).toBe(
      'There is no work item "ITEM-9".',
    );
  });
});
