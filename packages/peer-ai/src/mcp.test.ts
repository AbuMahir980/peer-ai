import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { skillRuleIds } from "peer-ai-skills";
import { MCP_TOOL_IDS } from "peer-ai-workflow";
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
  // Every rule the skill answers for gets a line; this change touches none but the first.
  coverage: skillRuleIds("code-review").map((rule, index) =>
    index === 0
      ? { rule, item: "file:apps/web/src/cart.ts", status: "pass", evidence: "cart.ts names say what they are" }
      : { rule, status: "not-applicable", reason: "Nothing in this change is of its kind." },
  ),
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
  it("drafts feedback about Peer AI with what it knows, and refuses code, keys and email addresses", async () => {
    const root = shop();
    const client = await connect(root);
    const drafted = await call(client, "draft_feedback", {
      title: "security-review flagged a test file as production code",
      what: "It reported a hard-coded password in a test fixture as a critical finding.",
      expected: "Test fixtures are out of scope unless a rule is about them.",
      skill: "security-review",
    });
    expect(drafted.isError).toBe(false);
    const draft = drafted.value().draft as string;
    expect(draft).toBe(".peer-ai/feedback/2026-10-02-security-review-flagged-a-test-file-as-production.md");
    const report = readFileSync(join(root, draft), "utf8");
    // Peer AI adds what it knows: its version, the AI tool that connected, the stage and profiles.
    expect(report).toContain("| AI tool | test |");
    expect(report).toContain("| Skill | security-review |");
    expect(report).toContain("| Stage | mvp |");
    expect(report).toContain("| Stack profiles | react |");

    const leaky = await call(client, "draft_feedback", {
      title: "A check failed",
      what: "It failed on:\n```\nconst key = 1;\n```\nand wrote to ada@example.com.",
      expected: "No failure.",
    });
    expect(leaky.isError).toBe(true);
    expect(leaky.text).toContain("block of code");
    expect(leaky.text).toContain("email address");
  });

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
      ["check_document", true],
      ["advance_work_item", false],
      ["draft_feedback", false],
    ]);
    expect(client.getInstructions()).toContain("Start a session with next_work");
    expect(client.getInstructions()).toContain("When next_work reports setup problems");
    expect(client.getInstructions()).toContain("call draft_feedback");
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

  it("checks a whole-project review's report without a work item, and refuses one that skips a rule", async () => {
    const root = shop();
    const client = await connect(root);
    const lines = skillRuleIds("security-review").map((rule) => ({
      rule,
      status: "not-applicable",
      reason: "Nothing in this project is of its kind.",
    }));
    const report = (coverage: unknown[]) => ({
      ...passingReport("ITEM-1"),
      workItem: undefined,
      skill: "security-review",
      coverage,
    });
    const path = ".peer-ai/reports/project/security-review.json";
    mkdirSync(join(root, ".peer-ai/reports/project"), { recursive: true });

    writeFileSync(join(root, path), json(report(lines)));
    expect((await call(client, "record_review", { skill: "security-review", report: path })).value()).toMatchObject({
      skill: "security-review",
      result: "pass",
      recorded: false,
    });

    writeFileSync(join(root, path), json(report(lines.slice(1))));
    const refused = await call(client, "record_review", { skill: "security-review", report: path });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain("The report leaves out 1 of security-review's rules");

    const noReport = await call(client, "record_review", { skill: "security-review", result: "pass" });
    expect(noReport.text).toBe("A review of the whole project needs its report: give the report's path.");
  });

  it("checks a document against its skill's template, and says what to fix", async () => {
    const root = shop();
    const client = await connect(root);
    const path = "docs/requirements.md";
    mkdirSync(join(root, "docs"), { recursive: true });

    writeFileSync(join(root, path), "# Requirements: Shop\n\n## Summary\n\nA shop.\n");
    const refused = await call(client, "check_document", { skill: "requirements-analysis", path });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain("docs/requirements.md isn't ready yet. Fix these, then call check_document again:");
    expect(refused.text).toContain("- Add the missing parts, each under its own heading: People and their problems");

    const parts = ["Summary", "People and their problems", "Needs", "Features", "Scope", "What it handles"];
    const more = ["Dependencies", "Open questions", "Assumptions", "Sources"];
    const filled = [...parts, ...more].map((part) => `## ${part}\n\nWritten.\n`).join("\n");
    writeFileSync(join(root, path), `# Requirements: Shop\n\n${filled}`);
    expect((await call(client, "check_document", { skill: "requirements-analysis", path })).value()).toMatchObject({
      ready: true,
      template: "requirements",
    });
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
