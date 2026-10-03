import { z } from "zod";
import { ACTIVITY_IDS, SKILL_IDS, TOOL_IDS, TRAITS } from "./ids.ts";

// peer-ai.config.json: everything a project used to get by editing or patching the
// playbook's files. Objects are strict, so a misspelt key is an error, not a silent no-op.
// Only `version`, `project.name` and `tracks` are required. Everything else has a default,
// so an informal project's config can be ten lines.

const Path = z.string().min(1).describe("A path relative to the project root, or a URL.");
const Slug = z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens");
const Note = z.string().min(1);
const RuleId = z
  .string()
  .regex(/^[A-Z][A-Z0-9]*-\d{2,}$/, "use a rule id such as SEC-07 or REACT-03")
  .describe("A standards rule id, such as SEC-07.");

const AddOn = z
  .string()
  .regex(
    /^(\/[a-z0-9-]+|[a-z0-9-]+:[a-z0-9-]+)$/,
    "use plugin:skill for a plugin skill, or /command for a tool's built-in command",
  )
  .describe("An extra skill that feeds Peer AI's own: plugin:skill, or /command for a tool's built-in command.");

const Project = z.strictObject({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  stage: z
    .enum(["prototype", "mvp", "production"])
    .optional()
    .describe(
      "How strict the gates are: prototype asks for the essentials only, production for everything. Defaults to mvp.",
    ),
  origin: z
    .enum(["new", "existing"])
    .optional()
    .describe(
      "new: nothing is built yet. existing: code or docs already exist; Peer AI reads them first and never overwrites them. Detected when omitted.",
    ),
  team: z
    .enum(["solo", "team"])
    .optional()
    .describe("solo: nobody else reviews, so no second reviewer is asked for. Defaults to solo."),
  traits: z
    .array(z.enum(TRAITS))
    .optional()
    .describe(
      "What the product is or does that switches on extra rules: money, safety-critical data, several apps or tenants on one backend, offline use, live connections, uploads, AI features.",
    ),
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
  kind: z.enum([
    "web",
    "mobile",
    "desktop",
    "backend",
    "infrastructure",
    "library",
    "cli",
    "data",
    "extension",
    "embedded",
    "other",
  ]),
  path: Path.optional(),
  repo: z
    .string()
    .min(1)
    .optional()
    .describe("For an external track: the repository it lives in, such as acme/platform-api."),
  stack: z.array(z.string().min(1)).optional(),
  architecture: Slug.optional().describe(
    "The architecture style, such as layered, modular-monolith, microservice, hexagonal, feature-first or mvvm. The project's architecture decisions are the source of truth; this label tells reviews and stack profiles what shape to expect.",
  ),
  targets: z
    .array(Slug)
    .optional()
    .describe("Platforms this track ships to, such as ios, android, web, macos or chrome."),
  uses: z
    .array(Slug)
    .optional()
    .describe("Tracks whose code this track shares, such as a core library. A change to one verifies both."),
  consumes: z.array(Slug).optional().describe("Ids of the APIs this track calls."),
  branch: z
    .string()
    .min(1)
    .optional()
    .describe("The track's long-lived integration branch, when it has one. Work item branches start from it."),
  deploy: z
    .strictObject({
      target: Slug.describe("Where it runs, such as vercel, fly, aws-ecs, app-store or play-store."),
      environments: z.array(Slug).optional(),
    })
    .optional(),
  status: z
    .enum(["active", "dormant", "frozen", "retiring", "external"])
    .describe(
      "active: being built or changed. dormant: not started; its activities do not run. frozen: it exists and is documented, not redesigned. retiring: being replaced; its behaviour is the reference until then. external: it lives in another repository and is read here, never changed.",
    ),
  replacedBy: z.array(Slug).min(1).optional().describe("For a retiring track: the tracks replacing it."),
  note: Note.optional(),
});

const Api = z.strictObject({
  id: Slug,
  kind: z
    .enum(["http", "graphql", "rpc", "websocket", "events", "in-process", "package", "cli"])
    .describe(
      "in-process: an interface inside the app, such as a repository over local storage. package and cli: the public surface of a library or a command-line tool.",
    ),
  providedBy: Slug.optional().describe(
    "The track that provides this API. Omit it for a third-party or hosted service.",
  ),
  contract: z
    .strictObject({
      source: z
        .enum(["handwritten", "openapi", "asyncapi", "graphql-schema", "protobuf", "types", "docs"])
        .describe(
          "Where the contract comes from. A generated source is the truth; any contract document is derived from it.",
        ),
      location: Path.optional(),
      checkDrift: z
        .boolean()
        .optional()
        .describe("Fail CI when the derived contract document no longer matches its source."),
    })
    .optional(),
  note: Note.optional(),
});

const Environment = z.strictObject({
  id: Slug,
  production: z.boolean().optional(),
  url: z.string().min(1).optional(),
});

const Repo = z.strictObject({
  host: z.enum(["github", "gitlab", "bitbucket", "azure-devops", "other"]).optional(),
  remote: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe("The git remote, such as origin, or null for a local-only repo."),
  defaultBranch: z.string().min(1).optional(),
  branchNaming: z.string().min(1).optional().describe("A pattern such as feature/{ticket}-{slug}."),
  commits: z.enum(["conventional", "ticket-prefix", "free"]).optional(),
  mergePolicy: z
    .enum(["pull-request", "local-merge"])
    .optional()
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
    .optional()
    .describe(
      "Run before any work item is called done. null or omitted means none yet; creating one is the first build item.",
    ),
  verifyCheck: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The CI check that runs the verify command on every pull request, as GitHub names it, such as "ci / check". Its result on a work item\'s commit counts as the verify, so nobody runs it again locally (RFC 0013).',
    ),
  test: z.string().min(1).optional(),
  lint: z.string().min(1).optional(),
  build: z.string().min(1).optional(),
});

const Delivery = z.strictObject({
  ci: z
    .enum(["none", "existing"])
    .describe("existing: extend the project's pipeline. A second, parallel pipeline is never added."),
  pipeline: Path.optional(),
  gate: z
    .boolean()
    .optional()
    .describe(
      "Whether CI runs peer-ai check. render sets it up and peer-ai doctor asks for it unless this is false. Defaults to true.",
    ),
});

const StandardsDocument = z.strictObject({
  path: Path,
  role: z.enum(["standard", "addendum", "checklist"]),
  scope: z.array(Slug).optional().describe("Track ids this document governs. Omit for the whole project."),
});

const Standards = z.strictObject({
  core: z.boolean().optional().describe("Apply Peer AI's core principles. Defaults to true."),
  profiles: z.array(Slug).optional().describe("Stack profiles, such as react, express or python-fastapi."),
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
  overrides: z
    .record(
      RuleId,
      z.strictObject({
        value: z
          .union([z.number(), z.string().min(1)])
          .describe("The project's value in place of the profile's default."),
        reason: Note,
      }),
    )
    .optional()
    .describe("A rule's default changed for this project, such as a larger component size limit, with the reason."),
  exceptions: z
    .array(
      z.strictObject({
        rule: RuleId,
        reason: Note,
        decidedBy: Note.describe("The person who decided to set the rule aside."),
        until: z.iso.date().optional().describe("When the exception ends, if it's temporary."),
      }),
    )
    .optional()
    .describe("Rules this project sets aside, each with a reason and who decided. peer-ai doctor lists them all."),
  enforcement: z
    .enum(["report", "enforce"])
    .optional()
    .describe(
      "report: the tools that enforce the profiles run and report, but never fail a build, for an existing codebase adopting them. enforce: they fail it. Defaults to enforce (RFC 0011).",
    ),
  deferred: z
    .array(
      z
        .strictObject({
          rule: RuleId,
          until: z.iso.date().optional().describe("The day the rule's enforcement starts to block."),
          untilItem: z
            .string()
            .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
            .optional()
            .describe("The work item that, once done, starts the rule's enforcement blocking."),
          reason: Note,
          decidedBy: Note.describe("The person who decided to defer it."),
        })
        .superRefine((deferral, ctx) => {
          if ((deferral.until === undefined) === (deferral.untilItem === undefined)) {
            ctx.addIssue({ code: "custom", path: ["until"], message: "give either until or untilItem" });
          }
        }),
    )
    .optional()
    .describe(
      "Rules whose enforcement only reports until a date or a work item; reviews still apply them (RFC 0011). peer-ai doctor lists them all.",
    ),
  coveredBy: z
    .array(
      z.strictObject({
        rule: RuleId,
        by: Path.describe("The project's own file that enforces the rule, such as a CI workflow."),
        reason: Note,
      }),
    )
    .optional()
    .describe("Rules the project's own tools already enforce, so render adds no second check (RFC 0011)."),
});

const Compliance = z.strictObject({
  jurisdictions: z
    .array(
      z
        .string()
        .regex(
          /^([A-Z]{2}(-[A-Z0-9]{1,3})?|[a-z][a-z0-9]*(-[a-z0-9]+)*)$/,
          "use an ISO 3166 code such as NG or US-CA, or a lowercase zone id such as eu or difc",
        ),
    )
    .optional()
    .describe("Where the product operates or has users."),
  industries: z.array(Slug).optional().describe("Such as payments, health, food or maritime."),
  packs: z
    .array(Slug)
    .optional()
    .describe(
      "Rule packs to apply: laws, industry standards, religious or cultural standards, labelling rules, platform policies. peer-ai assess suggests them from the jurisdictions, industries and data it finds.",
    ),
  dataInventory: Path.optional().describe("Where the inventory of personal and sensitive data fields lives."),
});

const Capability = z.strictObject({
  also: z.array(AddOn).optional(),
  checklists: z.array(Path).optional().describe("Project checklists the skill works through as well as its own rules."),
  notes: z.array(Note).optional(),
});

const ReviewChoices = z
  .strictObject({
    require: z
      .array(z.enum(SKILL_IDS))
      .optional()
      .describe("Reviews every change needs, beyond the ones Peer AI works out from what it touched."),
    skip: z
      .array(z.strictObject({ skill: z.enum(SKILL_IDS), reason: Note }))
      .optional()
      .describe("Reviews this project doesn't need, each with the reason."),
  })
  .describe("For verify: add to or remove from the reviews each change needs (RFC 0004).");

const Activity = z.strictObject({
  inputs: z.array(Path).optional().describe("Read these before anything else, and before asking the user anything."),
  notes: z.array(Note).optional().describe("Project-specific instructions for this activity."),
  reviews: ReviewChoices.optional(),
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

const Skills = z.strictObject({
  commit: z
    .boolean()
    .optional()
    .describe(
      "Commit the skills peer-ai render writes, for AI tools that can't run a setup step first. Defaults to false: they're rebuilt from the installed version and left out of git, and each tool's setup step writes them.",
    ),
});

const Gates = z.strictObject({
  blockOn: z
    .enum(["critical", "high", "medium"])
    .optional()
    .describe("The lowest open finding severity that blocks a merge. Defaults to critical."),
});

const Docs = z.strictObject({
  dir: Path.optional(),
  readme: z
    .boolean()
    .optional()
    .describe(
      'Have render keep a short section for people in README.md, "How we work: Peer AI", written from this config. Defaults to false (RFC 0014).',
    ),
  preserveStructure: z.boolean().optional().describe("Add to the existing docs; never reorganise them."),
  backlog: Path.optional().describe("Where ideas outside the agreed scope go, instead of becoming work items."),
});

const configShape = {
  $schema: z.string().optional(),
  extends: z
    .string()
    .min(1)
    .optional()
    .describe(
      "A shared base config to inherit, as a path or package name. The project's values win; objects merge key by key and lists are replaced.",
    ),
  version: z.literal(1),
  project: Project,
  tools: z.array(z.enum(TOOL_IDS)).min(1).optional(),
  skills: Skills.optional(),
  design: Design.optional(),
  tracks: z.array(Track).min(1),
  apis: z.array(Api).optional(),
  environments: z.array(Environment).optional(),
  repo: Repo.optional(),
  tracker: Tracker.optional(),
  commands: Commands.optional(),
  delivery: Delivery.optional(),
  standards: Standards.optional(),
  compliance: Compliance.optional(),
  rules: z
    .array(z.strictObject({ path: Path, description: Note.optional() }))
    .optional()
    .describe("Project rules every activity respects, wherever they are written, such as a contributing guide."),
  models: Models.optional(),
  gates: Gates.optional(),
  capabilities: z.partialRecord(z.enum(SKILL_IDS), Capability).optional(),
  activities: z.partialRecord(z.enum(ACTIVITY_IDS), Activity).optional(),
  docs: Docs.optional(),
  updates: z
    .strictObject({
      notify: z
        .boolean()
        .optional()
        .describe("Say in doctor and next_work when a newer Peer AI is out. Defaults to true."),
    })
    .optional()
    .describe("How the project hears about new Peer AI releases (RFC 0014)."),
  declined: z
    .array(
      z.union([
        z.strictObject({ profile: Slug, reason: Note }),
        z.strictObject({ trait: z.enum(TRAITS), reason: Note }),
      ]),
    )
    .optional()
    .describe(
      "Stack profiles and traits peer-ai assess suggests that the project decided not to take up, each with why, so doctor stops suggesting them (RFC 0011).",
    ),
};

type Config = z.output<z.ZodObject<typeof configShape>>;
type Issue = (issue: { path: (string | number)[]; message: string }) => void;

function checkUnique(ids: string[], path: (string | number)[], kind: string, report: Issue): void {
  ids.forEach((id, i) => {
    if (ids.indexOf(id) !== i) report({ path: [...path, i, "id"], message: `duplicate ${kind} id "${id}"` });
  });
}

function checkRefs(
  refs: string[] | undefined,
  known: string[],
  path: (string | number)[],
  kind: string,
  report: Issue,
): void {
  refs?.forEach((ref, i) => {
    if (!known.includes(ref)) report({ path: [...path, i], message: `"${ref}" is not ${kind}` });
  });
}

function checkConfig(config: Config, report: Issue): void {
  const trackIds = config.tracks.map((track) => track.id);
  const apiIds = (config.apis ?? []).map((api) => api.id);
  const environmentIds = (config.environments ?? []).map((environment) => environment.id);
  checkUnique(trackIds, ["tracks"], "track", report);
  checkUnique(apiIds, ["apis"], "api", report);
  checkUnique(environmentIds, ["environments"], "environment", report);

  config.tracks.forEach((track, i) => {
    const at = ["tracks", i];
    checkRefs(track.uses, trackIds, [...at, "uses"], "a track id", report);
    checkRefs(track.replacedBy, trackIds, [...at, "replacedBy"], "a track id", report);
    checkRefs(track.consumes, apiIds, [...at, "consumes"], "an api id", report);
    checkRefs(
      track.deploy?.environments,
      environmentIds,
      [...at, "deploy", "environments"],
      "an environment id",
      report,
    );
    if (track.uses?.includes(track.id) === true || track.replacedBy?.includes(track.id) === true) {
      report({ path: at, message: "a track cannot refer to itself" });
    }
    if (track.status === "external" && track.repo === undefined) {
      report({ path: [...at, "repo"], message: "an external track names the repository it lives in" });
    }
    if (track.status !== "external" && track.repo !== undefined) {
      report({ path: [...at, "repo"], message: "only an external track lives in another repository" });
    }
    if (track.status === "retiring" && track.replacedBy === undefined) {
      report({ path: [...at, "replacedBy"], message: "a retiring track names the tracks replacing it" });
    }
    if (track.status !== "retiring" && track.replacedBy !== undefined) {
      report({ path: [...at, "replacedBy"], message: "only a retiring track is replaced" });
    }
  });

  config.apis?.forEach((api, i) => {
    if (api.providedBy !== undefined && !trackIds.includes(api.providedBy)) {
      report({ path: ["apis", i, "providedBy"], message: `"${api.providedBy}" is not a track id` });
    }
  });

  config.standards?.documents?.forEach((doc, i) => {
    checkRefs(doc.scope, trackIds, ["standards", "documents", i, "scope"], "a track id", report);
  });

  config.declined?.forEach((entry, i) => {
    if ("profile" in entry && config.standards?.profiles?.includes(entry.profile) === true) {
      report({ path: ["declined", i, "profile"], message: `"${entry.profile}" is listed in standards.profiles too` });
    }
    if ("trait" in entry && config.project.traits?.includes(entry.trait) === true) {
      report({ path: ["declined", i, "trait"], message: `"${entry.trait}" is listed in project.traits too` });
    }
  });
}

export const ConfigSchema = z
  .strictObject(configShape)
  .superRefine((config, ctx) => {
    checkConfig(config, (issue) => {
      ctx.addIssue({ code: "custom", ...issue });
    });
  })
  .meta({
    title: "Peer AI project config",
    description: "peer-ai.config.json: a project's settings, shape, standards, rule packs and customisations.",
  });

export const ConfigLayerSchema = z.strictObject(configShape).partial().meta({
  title: "Peer AI shared base config",
  description: "A base config that projects inherit with extends. Every key is optional.",
});

export type PeerAiConfig = z.output<typeof ConfigSchema>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Merges a project's config over a base: objects merge key by key, lists and values are replaced. */
export function mergeConfigs(base: unknown, own: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(own)) return own === undefined ? base : own;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(own)) merged[key] = mergeConfigs(base[key], value);
  return merged;
}

/** Resolves a chain of configs, base first, into one config ready to validate. */
export function resolveConfig(layers: unknown[]): unknown {
  const resolved = layers.reduce<unknown>((base, own) => mergeConfigs(base, own), {});
  if (!isPlainObject(resolved)) return resolved;
  const withoutExtends = { ...resolved };
  delete withoutExtends.extends;
  return withoutExtends;
}
