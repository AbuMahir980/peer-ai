// The Peer AI MCP server. Every AI tool that speaks the Model Context Protocol reaches the same
// project map, work items and gates through it, so a project behaves the same whichever tool a
// person uses. It runs over stdio from the project's folder: `peer-ai mcp`.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  ACTIVITY_IDS,
  MapItemIdSchema,
  SKILL_IDS,
  WorkItemSchema,
  describeResult,
  type PeerAiConfig,
} from "peer-ai-workflow";
import { z } from "zod";
import { NEXT_STAGE, assess, gaps, loadConfig } from "./assess.ts";
import { CONFIG_FILE } from "./detect.ts";
import { checkDocumentOn } from "./document.ts";
import { draftFeedback } from "./feedback.ts";
import { VERSION } from "./package-info.ts";
import { compareVersions, pinnedVersion } from "./versions.ts";
import { reviewSizes } from "./review-cost.ts";
import { standardsFor } from "./standards.ts";
import { mapChanges, readMap } from "./state.ts";
import {
  advanceWorkItem,
  collisionsFor,
  recordProjectReview,
  createWorkItem,
  loadWorkItem,
  nextWork,
  recordReview,
  runCommand,
  runVerify,
  updateWorkItem,
  verifyFromCi,
  type CommandRunner,
  type Result,
  type ReviewInput,
} from "./work.ts";

const INSTRUCTIONS = `Peer AI keeps this project's map, its work items and the gates work must pass.
Start a session with next_work: it returns the work item for the current git branch and where it stopped, and every other open item in one line. Read another item in full with work_item before working on it.
Before editing a file, call standards_for_file and follow what it returns; ask it for the full text of the rules your change touches with ruleIds.
Record progress with update_work_item. Run verification with run_verify rather than reporting a result yourself; it verifies the item's latest commit, so commit first. When the project sets commands.verifyCheck, push and use run_verify with from: ci, so CI's run counts instead of running it again here.
Working in a git worktree of your own, give your branch to next_work: the tools find each work item on its own branch, wherever it's checked out.
Record each review with record_review, passing the path of its report, including failed and incomplete reviews.
Check each document a Peer AI skill writes with check_document, and fix what it names.
Move work with advance_work_item: build before changing code, verify once the change is complete, ship when it is verified, reviewed and ready to merge, done once merged or released.
Moving to ship or done passes the same gates as CI; when it refuses, fix what it lists.
When next_work or advance_work_item gives migrationCollisions, tell the person: whichever branch merges second needs its migration re-parented and reviewed again, and the order of merging is theirs to choose.
When next_work gives whatChanged, tell the person in a few plain words what changed in Peer AI since they last worked here, then carry on.
When next_work reports setup problems, fix what you can, such as running npx peer-ai render, before other work, and tell the person in plain words about anything only they can decide.
When Peer AI gets something wrong, call draft_feedback. At a natural stopping point, show the person each draft in a few words and ask whether to send it.`;

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
      if (errors === undefined) {
        return refuse(`There is no ${CONFIG_FILE} in ${root} or above it. Run npx peer-ai init in the project first.`);
      }
      const listed = errors.map((error) => `- ${error}`).join("\n");
      // After an update merges, a session still on the older server meets a config written for the
      // newer one: that's a reconnect, not a broken config (#201).
      const pinned = pinnedVersion(root);
      if (pinned !== undefined && compareVersions(pinned.version, VERSION) > 0) {
        return refuse(
          `This project now uses Peer AI ${pinned.version} (${pinned.from}), and this AI tool is still connected to Peer AI ${VERSION}, which can't read its newer ${CONFIG_FILE}. Ask the person to reconnect the AI tool to Peer AI, or restart it, to run ${pinned.version}. Until then, Peer AI's commands work from a terminal with npx peer-ai@${pinned.version}.\n\nWhat ${VERSION} doesn't recognise:\n${listed}`,
        );
      }
      return refuse(`${CONFIG_FILE} is not valid:\n${listed}`);
    };

  server.registerTool(
    "project_map",
    {
      title: "Project map",
      description:
        "Where the project stands: each item on the map (requirements, architecture, API contract, tests, CI, infrastructure and more) as present, partial, missing or not applicable, with the files that prove it; what the project's stage still needs; compliance signals such as personal data found in the schema; and each review's rough size over the whole project (reviewSizes), to tell the person before a whole-project review starts.",
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
        suggestedProfiles: assessment.suggestedProfiles,
        suggestedStacks: assessment.suggestedStacks,
        // A rough cost for each whole-project review, so the person can choose before one starts (RFC 0016).
        reviewSizes: reviewSizes(root),
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
        "The work to continue: the open work item for the current git branch in full, with where it stopped, its next action and the reviews it needs; and every open item in one line, with the items each is waiting for before it can ship (waitingFor); and other open items whose branches add a migration in the same folder as the current one's (migrationCollisions). Call work_item for another item in full. When nothing is open, the gaps the project's stage needs, to start as work items, with the Peer AI skill to use for each (useSkill). Working in a git worktree of your own, give your branch: the tools find each work item on its own branch, wherever it's checked out.",
      inputSchema: {
        branch: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Your branch, when you work in a worktree of your own. Leave it out to use the branch checked out here.",
          ),
      },
      annotations: READ_ONLY,
    },
    withProject((root, config, { branch }: { branch?: string | undefined }) => reply(nextWork(root, config, branch))),
  );

  server.registerTool(
    "work_item",
    {
      title: "Work item",
      description:
        "One work item in full: its goal, acceptance criteria, sources, where it stopped, its verify and reviews. next_work lists the open items in one line each; call this before working on an item that isn't the current branch's, or to read another item's acceptance criteria. It finds the item on its own branch, wherever that's checked out.",
      inputSchema: { id: z.string().min(1).describe("The work item's id, such as SHOP-41.") },
      annotations: READ_ONLY,
    },
    withProject((root, _config, { id }: { id: string }) => {
      const item = loadWorkItem(root, id);
      return item.ok ? reply(item.value) : refuse(item.error);
    }),
  );

  server.registerTool(
    "standards_for_file",
    {
      title: "Standards for a file",
      description:
        "The standards that govern a file: Peer AI's rules for what the file is, its language and the track it belongs to, each by its id, title and severity; and the project's own standards documents and rules for that track. Call it before editing a file. Follow every rule listed, and read and follow the documents it lists. For the full text of the rules this change touches (the rule, why, the question a review asks and how it's checked), call it again with their ids in ruleIds.",
      inputSchema: {
        file: z.string().min(1).describe("The file's path, relative to the project root."),
        ruleIds: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .describe("Rule ids, such as SEC-12, to return in full instead of every rule in brief."),
      },
      annotations: READ_ONLY,
    },
    withProject((root, config, { file, ruleIds }: { file: string; ruleIds?: string[] | undefined }) => {
      const standards = standardsFor(config, root, file, ruleIds);
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
        fixes: WorkItemSchema.shape.fixes,
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
        "Record where work stands, so the next session resumes exactly there: the next action, the activity and step it stopped at, its branch or its title. It also sets the item's goal, acceptance criteria, sources and dependencies, replacing any given before, and can move it to another track.",
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
        reason: z
          .string()
          .min(1)
          .optional()
          .describe("Why the acceptance criteria change. Needed after qa-acceptance found one not met."),
        by: z
          .string()
          .min(1)
          .optional()
          .describe("Who decided the change: whoever agreed the criteria. Needed with reason."),
        sources: WorkItemSchema.shape.sources,
        dependsOn: WorkItemSchema.shape.dependsOn,
        fixes: WorkItemSchema.shape.fixes,
        track: z.string().min(1).optional().describe("Move the item to another track, any but a retired one."),
        waive: z
          .strictObject({
            skill: z.enum(SKILL_IDS),
            reason: z.string().min(1),
            by: z.string().min(1).describe("The person who decided."),
          })
          .optional()
          .describe(
            "A person's decision that this item doesn't need a review it was asked for, with why. Only when they decide it; at production, only a light review can be waived.",
          ),
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
        "Run the project's verify command (commands.verify in peer-ai.config.json) and record the result on the work item, with the commit it ran on and the end of its output. A work item can't move to ship or done without a passing verify on its latest commit, and only this tool records one. With from: ci, it doesn't run anything: it takes the result of the CI check that runs the verify (commands.verifyCheck) on the item's latest commit, pushed, from GitHub, and records it with a link to the run. Prefer that when the project sets commands.verifyCheck: it spares running a slow verify again here.",
      inputSchema: {
        id: itemId,
        from: z
          .enum(["here", "ci"])
          .optional()
          .describe("here runs the verify command now (the default); ci takes CI's result for the latest commit."),
      },
      annotations: { ...WRITES, openWorldHint: true },
    },
    withProject(async (root, config, { id, from }: { id: string; from?: "here" | "ci" | undefined }) => {
      if (from === "ci") {
        const taken = verifyFromCi(root, config, id, now());
        if (!taken.ok) return refuse(taken.error);
        const verify = taken.value.lastVerify;
        return reply({ id, from: "ci", result: verify?.result, ci: verify?.ci });
      }
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
        "Record a review of a work item. Write the review's report first (.peer-ai/reports/<work item>/<skill>-<time>.json, in the review-report format; a report anywhere else is refused) and pass its path: Peer AI checks the report, including that every rule the skill answers for has a coverage line, and works out pass, fail or incomplete from it. If it refuses, fix what it names and call it again. A review recorded without a report is marked unproven. Record failed and incomplete reviews too. The review is recorded with the commit it looked at, and recording the same skill again replaces the earlier one. For a review of the whole project, which has no work item, leave out the id: Peer AI checks the report the same way, and records it in .peer-ai/project-reviews.json with its open findings, so next_work and the gate keep them in sight until work items list them in fixes.",
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
      if (id !== undefined) {
        const recorded = recordReview(root, config, id, review, now());
        if (!recorded.ok) return refuse(recorded.error);
        // The result with what it leaves open, so a pass is never read as all clear (RFC 0015).
        const entry = recorded.value.reviews?.find((each) => each.skill === review.skill);
        const said = entry === undefined ? undefined : `${entry.skill}: ${describeResult(entry.result, entry.open)}`;
        return reply({ ...recorded.value, ...(said === undefined ? {} : { recorded: said }) });
      }
      if (review.report === undefined) {
        return refuse("A review of the whole project needs its report: give the report's path.");
      }
      // A whole-project review is recorded too, with its open findings, for work items to fix (RFC 0015).
      const recorded = recordProjectReview(root, config, { ...review, report: review.report }, now());
      if (!recorded.ok) return refuse(recorded.error);
      return reply({
        ...recorded.value,
        recorded: `${recorded.value.skill}: ${describeResult(recorded.value.result, recorded.value.open)}`,
        ...(recorded.value.findings.length === 0
          ? {}
          : {
              next: "Tell the person its result. Then, with them, group its open findings into work items with create_work_item, each listing the findings it fixes in fixes, as skill#finding.",
            }),
      });
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
        branch: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Your branch, when you work in a git worktree of your own: the document is read where it's checked out.",
          ),
      },
      annotations: READ_ONLY,
    },
    withProject(
      (
        root,
        _config,
        input: { skill: string; path: string; template?: string | undefined; branch?: string | undefined },
      ) => {
        const checked = checkDocumentOn(root, input);
        if (!checked.ok) return refuse(checked.error);
        if (checked.value.ready) return reply(checked.value);
        return refuse(
          `${input.path} isn't ready yet. Fix these, then call check_document again:\n${checked.value.problems.map((problem) => `- ${problem}`).join("\n")}`,
        );
      },
    ),
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
    withProject((root, config, { id, to }: { id: string; to?: Parameters<typeof advanceWorkItem>[3] }) => {
      const moved = advanceWorkItem(root, config, id, to, now());
      if (!moved.ok) return refuse(moved.error);
      // Moving to verify or ship repeats a migration collision, as a warning, never a refusal (RFC 0018).
      const collisions = ["verify", "ship"].includes(moved.value.stage) ? collisionsFor(root, config, moved.value) : [];
      return reply(collisions.length === 0 ? moved.value : { ...moved.value, migrationCollisions: collisions });
    }),
  );

  server.registerTool(
    "draft_feedback",
    {
      title: "Draft feedback",
      description:
        "Draft a report for Peer AI's maintainers when Peer AI itself gets something wrong: a review misses a problem or reports one that isn't there, a check blocks work by mistake, a skill's step can't be followed, or a command fails or misleads. Not for problems in the project. The draft stays in .peer-ai/feedback/ until the person decides; never send it yourself. Describe everything in plain words: never include the project's code, file contents, names of people, companies or products, secrets, or URLs and hosts. Peer AI refuses a draft holding code, a key or token, or an email address. When the reply has a note, the draft looks like a report this project already sent: tell the person, and drop the draft if it's the same.",
      inputSchema: {
        title: z
          .string()
          .min(1)
          .max(120)
          .describe('One line, such as "security-review flagged a test file as production code".'),
        what: z.string().min(1).max(4000).describe("What happened, in plain words."),
        expected: z.string().min(1).max(2000).describe("What should have happened."),
        skill: z.enum(SKILL_IDS).optional().describe("The Peer AI skill involved, when there is one."),
        command: z
          .string()
          .min(1)
          .max(120)
          .optional()
          .describe("The peer-ai command or MCP tool involved, when there is one."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    (input: Parameters<typeof draftFeedback>[2]) => {
      const root = findRoot(options.cwd);
      const { config } = loadConfig(root);
      const client = server.server.getClientVersion()?.name;
      return fromResult(draftFeedback(root, config, input, client === undefined ? {} : { tool: client }, now()));
    },
  );

  return server;
}

/** Serves over stdio until the AI tool closes the connection. Nothing else may write to stdout. */
export async function serveStdio(cwd: string): Promise<void> {
  await createServer({ cwd }).connect(new StdioServerTransport());
}
