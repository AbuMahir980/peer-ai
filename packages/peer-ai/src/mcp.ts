// The Peer AI MCP server. Every AI tool that speaks the Model Context Protocol reaches the same
// project map, work items and gates through it, so a project behaves the same whichever tool a
// person uses. It runs over stdio from the project's folder: `peer-ai mcp`.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ACTIVITY_IDS, MapItemIdSchema, SKILL_IDS, WorkItemSchema, type PeerAiConfig } from "@peer-ai/workflow";
import { z } from "zod";
import { NEXT_STAGE, assess, gaps, loadConfig } from "./assess.ts";
import { CONFIG_FILE } from "./detect.ts";
import { VERSION } from "./package-info.ts";
import { standardsFor } from "./standards.ts";
import { mapChanges, readMap } from "./state.ts";
import {
  advanceWorkItem,
  createWorkItem,
  nextWork,
  recordReview,
  runCommand,
  runVerify,
  updateWorkItem,
  type CommandRunner,
  type Result,
} from "./work.ts";

const INSTRUCTIONS = `Peer AI keeps this project's map, its work items and the gates work must pass.
Start a session with next_work: it returns the work item for the current git branch and where it stopped.
Before editing a file, call standards_for_file and follow what it returns.
Record progress with update_work_item. Run verification with run_verify rather than reporting a result yourself.
Record each review with record_review, including failed and incomplete ones.
Move work with advance_work_item: build before changing code, verify once the change is complete, ship when it is verified, reviewed and ready to merge, done once merged or released.
Moving to ship or done passes the same gates as CI; when it refuses, fix what it lists.`;

export interface ServerOptions {
  /** Where the AI tool started the server: the project's folder or one inside it. */
  cwd: string;
  now?: () => Date;
  run?: CommandRunner;
}

/** The nearest folder at or above `start` with a config, or `start` itself when there is none. */
export function findRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, CONFIG_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const reply = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});
const refuse = (message: string): CallToolResult => ({ isError: true, content: [{ type: "text", text: message }] });
const fromResult = <T>(result: Result<T>): CallToolResult => (result.ok ? reply(result.value) : refuse(result.error));

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const WRITES = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

const itemId = z.string().min(1).describe("The work item's id, such as ITEM-3 or PROJ-14.");

export function createServer(options: ServerOptions): McpServer {
  const now = options.now ?? (() => new Date());
  const run = options.run ?? runCommand;
  const server = new McpServer({ name: "peer-ai", version: VERSION }, { instructions: INSTRUCTIONS });

  /** Every tool works from the project's config; without one it says how to create it. */
  const withProject =
    <A>(handle: (root: string, config: PeerAiConfig, args: A) => CallToolResult | Promise<CallToolResult>) =>
    (args: A): CallToolResult | Promise<CallToolResult> => {
      const root = findRoot(options.cwd);
      const { config, errors } = loadConfig(root);
      if (config !== undefined) return handle(root, config, args);
      return refuse(
        errors === undefined
          ? `There is no ${CONFIG_FILE} in ${root} or above it. Run npx peer-ai init in the project first.`
          : `${CONFIG_FILE} is not valid:\n${errors.map((error) => `- ${error}`).join("\n")}`,
      );
    };

  server.registerTool(
    "project_map",
    {
      title: "Project map",
      description:
        "Where the project stands: each item on the map (requirements, architecture, API contract, tests, CI, infrastructure and more) as present, partial, missing or not applicable, with the files that prove it; what the project's stage still needs; and compliance signals such as personal data found in the schema.",
      annotations: READ_ONLY,
    },
    withProject((root, config) => {
      const stage = config.project.stage ?? "mvp";
      const assessment = assess(root, config, stage);
      const next = NEXT_STAGE[stage];
      const needed = gaps(assessment, stage);
      const stored = readMap(root);
      return reply({
        project: assessment.name,
        stage,
        items: assessment.items,
        neededFor: { [stage]: needed },
        ...(next === undefined
          ? {}
          : { laterFor: { [next]: gaps(assessment, next).filter((id) => !needed.includes(id)) } }),
        signals: assessment.signals,
        storedMap:
          stored === undefined
            ? "There is no .peer-ai/map.json yet. Run npx peer-ai assess to write it."
            : stored.ok
              ? { assessedAt: stored.value.assessedAt, changedSince: mapChanges(stored.value, assessment) }
              : `.peer-ai/map.json ${stored.error}`,
      });
    }),
  );

  server.registerTool(
    "next_work",
    {
      title: "Next work",
      description:
        "The work to continue: the open work item for the current git branch, with where it stopped and its next action, and every other open item. When nothing is open, the gaps the project's stage needs, to start as work items.",
      annotations: READ_ONLY,
    },
    withProject((root, config) => reply(nextWork(root, config))),
  );

  server.registerTool(
    "standards_for_file",
    {
      title: "Standards for a file",
      description:
        "The standards that govern a file: the track it belongs to, the stack profiles, and the project's own standards documents and rules for that track. Call it before editing a file, then read and follow the documents it lists.",
      inputSchema: { file: z.string().min(1).describe("The file's path, relative to the project root.") },
      annotations: READ_ONLY,
    },
    withProject((root, config, { file }: { file: string }) => {
      const standards = standardsFor(config, root, file);
      return standards === undefined ? refuse(`${file} is outside the project.`) : reply(standards);
    }),
  );

  server.registerTool(
    "create_work_item",
    {
      title: "Create a work item",
      description:
        "Start a piece of work: a feature, bug, refactor, migration, discovery, chore, or a gap on the project map. It starts at prepare. The id comes from the tracker's ticket prefix unless you give one, such as a tracker key.",
      inputSchema: {
        title: z.string().min(1),
        kind: WorkItemSchema.shape.kind,
        track: z.string().min(1).optional().describe("The track it changes. Needed when the project has several."),
        gap: MapItemIdSchema.optional().describe("For kind gap: the map item this work fills, such as threat-model."),
        id: z.string().min(1).optional().describe("A tracker key such as PROJ-14, or GH-42 for a GitHub issue."),
        branch: z.string().min(1).optional().describe("Its git branch. Filled from the repo's naming pattern if set."),
        next: z.string().min(1).max(200).optional().describe("One line: the first action."),
      },
      annotations: WRITES,
    },
    withProject((root, config, input: Parameters<typeof createWorkItem>[2]) =>
      fromResult(createWorkItem(root, config, input, now())),
    ),
  );

  server.registerTool(
    "update_work_item",
    {
      title: "Update a work item",
      description:
        "Record where work stands, so the next session resumes exactly there: the next action, the activity and step it stopped at, its branch or its title.",
      inputSchema: {
        id: itemId,
        next: z.string().min(1).max(200).optional().describe("One line: the next action."),
        position: z
          .object({ activity: z.enum(ACTIVITY_IDS), step: z.number().int().positive() })
          .optional()
          .describe("The activity and step where work stopped."),
        branch: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      },
      annotations: { ...WRITES, idempotentHint: true },
    },
    withProject((root, config, { id, ...changes }: { id: string } & Parameters<typeof updateWorkItem>[3]) =>
      fromResult(updateWorkItem(root, config, id, changes, now())),
    ),
  );

  server.registerTool(
    "run_verify",
    {
      title: "Run verify",
      description:
        "Run the project's verify command (commands.verify in peer-ai.config.json) and record the result on the work item, with the end of its output. A work item can't move to ship or done without a passing verify, and only this tool records one.",
      inputSchema: { id: itemId },
      annotations: { ...WRITES, openWorldHint: true },
    },
    withProject(async (root, config, { id }: { id: string }) => {
      const outcome = await runVerify(root, config, id, now, run);
      if (!outcome.ok) return refuse(outcome.error);
      const { command, result, output } = outcome.value;
      return reply({ id, command, result, output });
    }),
  );

  server.registerTool(
    "record_review",
    {
      title: "Record a review",
      description:
        "Record the result of a review skill on a work item: pass, fail, or incomplete when it couldn't check every rule. Record failures too. The latest result from each skill is the one the gates read.",
      inputSchema: {
        id: itemId,
        skill: z.enum(SKILL_IDS),
        result: z.enum(["pass", "fail", "incomplete"]),
        report: z.string().min(1).optional().describe("Where the review's report was written."),
      },
      annotations: WRITES,
    },
    withProject((root, config, { id, ...review }: { id: string } & Parameters<typeof recordReview>[3]) =>
      fromResult(recordReview(root, config, id, review, now())),
    ),
  );

  server.registerTool(
    "advance_work_item",
    {
      title: "Advance a work item",
      description:
        "Move a work item to its next stage (prepare, build, verify, ship, done), to an earlier stage to reopen it, or to cancelled. Moving to ship or done passes the same gates as CI: a passing verify, passing reviews, and for a gap, the gap filled. When it refuses, it lists what to fix.",
      inputSchema: {
        id: itemId,
        to: WorkItemSchema.shape.stage.optional().describe("The stage to move to. Omit it for the next one."),
      },
      annotations: WRITES,
    },
    withProject((root, config, { id, to }: { id: string; to?: Parameters<typeof advanceWorkItem>[3] }) =>
      fromResult(advanceWorkItem(root, config, id, to, now())),
    ),
  );

  return server;
}

/** Serves over stdio until the AI tool closes the connection. Nothing else may write to stdout. */
export async function serveStdio(cwd: string): Promise<void> {
  await createServer({ cwd }).connect(new StdioServerTransport());
}
