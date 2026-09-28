import { z } from "zod";
import { ACTIVITY_IDS, SKILL_IDS, TOOL_IDS } from "./ids.ts";

// peer-ai.config.json: everything a project used to get by editing or patching the
// playbook's files. Objects are strict, so a misspelt key is an error, not a silent no-op.

const Path = z.string().min(1).describe("A path relative to the project root, or a URL.");
const Slug = z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens");
const Note = z.string().min(1);

const AddOn = z
  .string()
  .regex(
    /^(\/[a-z0-9-]+|[a-z0-9-]+:[a-z0-9-]+)$/,
    "use plugin:skill for a plugin skill, or /command for a tool's built-in command",
  )
  .describe("An extra skill to run alongside Peer AI's own: plugin:skill, or /command for a tool's built-in command.");

const Project = z.strictObject({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  stage: z
    .enum(["prototype", "mvp", "production"])
    .describe("Sets how strict the gates are. A prototype skips what only production needs, such as SLOs."),
  origin: z
    .enum(["new", "existing"])
    .describe(
      "new: nothing is built yet. existing: code or docs already exist; Peer AI reads them first and never overwrites them.",
    ),
});

const Api = z.strictObject({
  kind: z
    .enum(["none", "in-process", "http", "graphql", "rpc"])
    .describe("in-process: the boundary is an interface inside the app, such as a repository over local storage."),
  contract: z
    .strictObject({
      source: z
        .enum(["handwritten", "openapi", "types"])
        .describe(
          "Where the contract comes from. openapi and types are generated sources; the contract document is derived from them.",
        ),
      location: Path.optional(),
      checkDrift: z.boolean().optional().describe("Fail CI when the derived contract document no longer matches."),
    })
    .optional(),
});

const Design = z.strictObject({
  status: z.enum(["exists", "to-be-produced", "none"]),
  reference: Path.optional(),
  tokens: Path.optional(),
  authoritative: z
    .boolean()
    .optional()
    .describe("When true, layouts, spacing, type and colour are implemented exactly; nothing is invented."),
  stopAfterSpecify: z
    .boolean()
    .optional()
    .describe("Designs are made outside the session from the specs; work waits after Specify until they land."),
});

const Track = z.strictObject({
  id: Slug,
  kind: z.enum(["web", "mobile", "desktop", "backend", "infrastructure", "library", "cli", "data"]),
  path: Path.optional(),
  stack: z.array(z.string().min(1)).optional(),
  branch: z
    .string()
    .min(1)
    .optional()
    .describe("The track's long-lived integration branch, when it has one. Work item branches start from it."),
  status: z
    .enum(["active", "dormant", "frozen"])
    .describe(
      "active: being built or changed. dormant: not started; its activities do not run. frozen: it exists and is documented, not redesigned.",
    ),
  note: Note.optional(),
});

const Repo = z.strictObject({
  remote: z.string().min(1).nullable().describe("The git remote, such as origin, or null for a local-only repo."),
  defaultBranch: z.string().min(1).optional(),
  branchNaming: z.string().min(1).optional().describe("A pattern such as feature/{ticket}-{slug}."),
  commits: z.enum(["conventional", "ticket-prefix", "free"]).optional(),
  mergePolicy: z
    .enum(["pull-request", "local-merge"])
    .describe(
      "pull-request is required once branch protection is on. local-merge suits only a solo, unprotected repo.",
    ),
  pushEachCommit: z
    .boolean()
    .optional()
    .describe("Push every commit as it lands, for repos whose remote is the backup."),
});

const Tracker = z.strictObject({
  kind: z.enum(["none", "github", "gitlab", "linear", "jira", "other"]),
  ticketPrefix: z.string().min(1).optional(),
  project: z.string().min(1).optional().describe("The repo slug, project key or URL."),
});

const Commands = z.strictObject({
  verify: z
    .string()
    .min(1)
    .nullable()
    .describe("Run before any work item is called done. null means none yet; creating one is the first build item."),
  test: z.string().min(1).optional(),
  lint: z.string().min(1).optional(),
  build: z.string().min(1).optional(),
});

const Delivery = z.strictObject({
  ci: z
    .enum(["none", "existing"])
    .describe("existing: extend the project's pipeline. A second, parallel pipeline is never added."),
  pipeline: Path.optional(),
});

const StandardsDocument = z.strictObject({
  path: Path,
  role: z.enum(["standard", "addendum", "checklist"]),
  scope: z.array(Slug).optional().describe("Track ids this document governs. Omit for the whole project."),
});

const Standards = z.strictObject({
  core: z.boolean().optional().describe("Apply Peer AI's core principles. Defaults to true."),
  profiles: z.array(Slug).optional().describe("Stack profiles, such as react or python-fastapi."),
  documents: z.array(StandardsDocument).optional(),
  precedence: z
    .enum(["project", "core"])
    .optional()
    .describe("Which side wins a conflict. Defaults to project: the project's own documents win."),
  onExisting: z
    .enum(["map", "revise"])
    .optional()
    .describe(
      "What the Standards activity does with existing documents: map each rule to its enforcer, or revise the documents.",
    ),
});

const Capability = z.strictObject({
  also: z.array(AddOn).optional(),
  checklists: z.array(Path).optional().describe("Project checklists the skill works through as well as its own rules."),
  notes: z.array(Note).optional(),
});

const Activity = z.strictObject({
  inputs: z.array(Path).optional().describe("Read these before anything else, and before asking the user anything."),
  notes: z.array(Note).optional().describe("Project-specific instructions for this activity."),
});

const Models = z
  .strictObject({
    policy: z
      .enum(["none", "tiers", "pinned"])
      .describe("none: no model guidance. tiers: Peer AI's tier per activity. pinned: the models named here."),
    default: z.string().min(1).optional(),
    byActivity: z.partialRecord(z.enum(ACTIVITY_IDS), z.string().min(1)).optional(),
    ifUnavailable: z
      .enum(["most-capable", "ask"])
      .optional()
      .describe("What to do when a pinned model is not offered. Never a weaker model for a gate."),
  })
  .superRefine((models, ctx) => {
    if (models.policy === "pinned" && models.default === undefined) {
      ctx.addIssue({ code: "custom", path: ["default"], message: "a pinned policy needs a default model" });
    }
    if (models.policy !== "pinned" && (models.default !== undefined || models.byActivity !== undefined)) {
      ctx.addIssue({ code: "custom", path: ["policy"], message: "model names are only used with the pinned policy" });
    }
  });

const Gates = z.strictObject({
  blockOn: z
    .enum(["critical", "high", "medium"])
    .optional()
    .describe("The lowest open finding severity that blocks a merge. Defaults to critical."),
});

const Docs = z.strictObject({
  dir: Path.optional(),
  preserveStructure: z.boolean().optional().describe("Add to the existing docs; never reorganise them."),
  backlog: Path.optional().describe("Where ideas outside the agreed scope go, instead of becoming work items."),
});

export const ConfigSchema = z
  .strictObject({
    $schema: z.string().optional(),
    version: z.literal(1),
    project: Project,
    tools: z.array(z.enum(TOOL_IDS)).min(1),
    shape: z.strictObject({ api: Api, design: Design }),
    tracks: z.array(Track).min(1),
    repo: Repo,
    tracker: Tracker,
    commands: Commands,
    delivery: Delivery.optional(),
    standards: Standards.optional(),
    rules: z
      .array(z.strictObject({ path: Path, description: Note.optional() }))
      .optional()
      .describe("Project rules every activity respects, such as repository rules kept in CONTEXT.md."),
    models: Models.optional(),
    gates: Gates.optional(),
    capabilities: z.partialRecord(z.enum(SKILL_IDS), Capability).optional(),
    activities: z.partialRecord(z.enum(ACTIVITY_IDS), Activity).optional(),
    docs: Docs.optional(),
  })
  .superRefine((config, ctx) => {
    const ids = config.tracks.map((track) => track.id);
    ids.forEach((id, i) => {
      if (ids.indexOf(id) !== i)
        ctx.addIssue({ code: "custom", path: ["tracks", i, "id"], message: `duplicate track id "${id}"` });
    });
    config.standards?.documents?.forEach((doc, i) => {
      doc.scope?.forEach((scope, j) => {
        if (!ids.includes(scope)) {
          ctx.addIssue({
            code: "custom",
            path: ["standards", "documents", i, "scope", j],
            message: `"${scope}" is not a track id`,
          });
        }
      });
    });
    if (config.shape.api.kind === "none" && config.shape.api.contract !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["shape", "api", "contract"],
        message: "an api of kind none has no contract",
      });
    }
  })
  .meta({
    title: "Peer AI project config",
    description: "peer-ai.config.json: a project's settings, shape, standards and customisations.",
  });

export type PeerAiConfig = z.output<typeof ConfigSchema>;
