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
import { checkDocumentFile } from "./document.ts";
import { VERSION } from "./package-info.ts";
import { standardsFor } from "./standards.ts";
import { mapChanges, readMap } from "./state.ts";
import {
  advanceWorkItem,
  checkReport,
  createWorkItem,
  nextWork,
  recordReview,
  runCommand,
  runVerify,
  updateWorkItem,
  type CommandRunner,
  type Result,
  type ReviewInput,
} from "./work.ts";

const INSTRUCTIONS = `Peer AI keeps this project's map, its work items and the gates work must pass.
Start a session with next_work: it returns the work item for the current git branch and where it stopped.
Before editing a file, call standards_for_file and follow what it returns.
Record progress with update_work_item. Run verification with run_verify rather than reporting a result yourself.
Record each review with record_review, passing the path of its report, including failed and incomplete reviews.
Check each document a Peer AI skill writes with check_document, and fix what it names.
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
        suggestedTraits: assessment.suggestedTraits,
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
        "The work to continue: the open work item for the current git branch, with where it stopped, its next action and the reviews it needs, and every other open item, with the items each is waiting for before it can ship. When nothing is open, the gaps the project's stage needs, to start as work items, with the Peer AI skill to use for each (useSkill).",
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
        "Start a piece of work: a feature, bug, refactor, migration, discovery, chore, or a gap on the project map. It starts at prepare. The id comes from the tracker's ticket prefix unless you give one, such as a tracker key. Give it a goal, acceptance criteria, the sources it implements and the items it depends on when you know them: it can't ship before those items have.",
      inputSchema: {
        title: z.string().min(1),
        kind: WorkItemSchema.shape.kind,
        track: z.string().min(1).optional().describe("The track it changes. Needed when the project has several."),
        gap: MapItemIdSchema.optional().describe("For kind gap: the map item this work fills, such as threat-model."),
        id: z.string().min(1).optional().describe("A tracker key such as PROJ-14, or GH-42 for a GitHub issue."),
        branch: z.string().min(1).optional().describe("Its git branch. Filled from the repo's naming pattern if set."),
        next: z.string().min(1).max(200).optional().describe("One line: the first action."),
        goal: WorkItemSchema.shape.goal,
        acceptance: WorkItemSchema.shape.acceptance,
        sources: WorkItemSchema.shape.sources,
        dependsOn: WorkItemSchema.shape.dependsOn,
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
        "Record where work stands, so the next session resumes exactly there: the next action, the activity and step it stopped at, its branch or its title. It also sets the item's goal, acceptance criteria, sources and dependencies, replacing any given before.",
      inputSchema: {
        id: itemId,
        next: z.string().min(1).max(200).optional().describe("One line: the next action."),
        position: z
          .object({ activity: z.enum(ACTIVITY_IDS), step: z.number().int().positive() })
          .optional()
          .describe("The activity and step where work stopped."),
        branch: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        goal: WorkItemSchema.shape.goal,
        acceptance: WorkItemSchema.shape.acceptance,
        sources: WorkItemSchema.shape.sources,
        dependsOn: WorkItemSchema.shape.dependsOn,
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
        "Record a review of a work item. Write the review's report first (.peer-ai/reports/<work item>/<skill>-<time>.json, in the review-report format) and pass its path: Peer AI checks the report, including that every rule the skill answers for has a coverage line, and works out pass, fail or incomplete from it. If it refuses, fix what it names and call it again. A review recorded without a report is marked unproven. Record failed and incomplete reviews too. For a review of the whole project, which has no work item, leave out the id: Peer AI checks the report the same way and gives its result, without recording it anywhere.",
      inputSchema: {
        id: itemId.optional().describe("The work item reviewed. Leave it out for a review of the whole project."),
        skill: z.enum(SKILL_IDS),
        report: z.string().min(1).optional().describe("The review report's path, relative to the project root."),
        result: z
          .enum(["pass", "fail", "incomplete"])
          .optional()
          .describe("Needed only without a report. With one, it must match the result the report supports."),
        summary: z.string().min(1).max(500).optional().describe("A short summary for people."),
      },
      annotations: WRITES,
    },
    withProject((root, config, { id, ...review }: { id?: string | undefined } & ReviewInput) => {
      if (id !== undefined) return fromResult(recordReview(root, config, id, review, now()));
      if (review.report === undefined) {
        return refuse("A review of the whole project needs its report: give the report's path.");
      }
      const checked = checkReport(root, config, { ...review, report: review.report });
      return fromResult(
        checked.ok
          ? {
              ok: true,
              value: {
                ...checked.value,
                recorded: false,
                note: "The report is valid. A review of the whole project has no work item, so it isn't recorded; tell the person its result.",
              },
            }
          : checked,
      );
    }),
  );

  server.registerTool(
    "check_document",
    {
      title: "Check a document",
      description:
        "Check a document a Peer AI document skill wrote, such as requirements or a threat model, against the skill's template: every required part present and filled in, no template text left in, and only rule ids that exist. Write the document first and pass its path. When it isn't ready, it lists what to change: fix it and call check_document again, until it's ready.",
      inputSchema: {
        skill: z.enum(SKILL_IDS).describe("The document skill that wrote it, such as requirements-analysis."),
        path: z.string().min(1).describe("The document's path, relative to the project root."),
        template: z
          .string()
          .min(1)
          .optional()
          .describe("Which of the skill's templates it follows, when it has several. Defaults to the main one."),
      },
      annotations: READ_ONLY,
    },
    withProject((root, _config, input: { skill: string; path: string; template?: string | undefined }) => {
      const checked = checkDocumentFile(root, input);
      if (!checked.ok) return refuse(checked.error);
      if (checked.value.ready) return reply(checked.value);
      return refuse(
        `${input.path} isn't ready yet. Fix these, then call check_document again:\n${checked.value.problems.map((problem) => `- ${problem}`).join("\n")}`,
      );
    }),
  );

  server.registerTool(
    "advance_work_item",
    {
      title: "Advance a work item",
      description:
        "Move a work item to its next stage (prepare, build, verify, ship, done), to an earlier stage to reopen it, or to cancelled. Moving to verify works out the reviews the change needs from the files it touched. Moving to ship or done passes the same gates as CI: a passing verify, the required reviews passing, and for a gap, the gap filled. When it refuses, it lists what to fix.",
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
