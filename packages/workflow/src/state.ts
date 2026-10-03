import { z } from "zod";
import { ACTIVITY_IDS, CUSTOM_MAP_ITEM_PATTERN, MAP_ITEM_IDS, SKILL_IDS } from "./ids.ts";

// Project state lives in .peer-ai/: one map.json, plus one file per work item under
// .peer-ai/work/. Parallel sessions touch different files, so they no longer collide on a
// single state file. Which item a session is on follows from the git branch it is on.

const Path = z.string().min(1);
const Timestamp = z.iso.datetime({ offset: true });

export const MapItemIdSchema = z.union([
  z.enum(MAP_ITEM_IDS),
  z.string().regex(CUSTOM_MAP_ITEM_PATTERN, "custom map items start with x-"),
]);

const MapItem = z
  .strictObject({
    status: z.enum(["present", "partial", "missing", "not-applicable"]),
    evidence: z.array(Path).optional().describe("Files or URLs that prove the status."),
    inferred: z
      .boolean()
      .optional()
      .describe("Found by reading the code, not a document, and not yet confirmed by a person."),
    note: z.string().min(1).max(200).optional(),
    checkedAt: Timestamp,
  })
  .superRefine((item, ctx) => {
    if ((item.status === "present" || item.status === "partial") && (item.evidence ?? []).length === 0) {
      ctx.addIssue({ code: "custom", path: ["evidence"], message: `a ${item.status} item needs evidence` });
    }
    if (item.status === "not-applicable" && item.note === undefined) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "say why this item does not apply" });
    }
  });

export const MapSchema = z
  .strictObject({
    $schema: z.string().optional(),
    version: z.literal(1),
    assessedAt: Timestamp,
    items: z.partialRecord(MapItemIdSchema, MapItem),
  })
  .meta({
    title: "Peer AI project map",
    description: ".peer-ai/map.json: what the project has, what is partial, and what is missing, with evidence.",
  });

const ActivityProgress = z
  .strictObject({
    id: z.enum(ACTIVITY_IDS),
    status: z.enum(["pending", "in-progress", "done", "skipped"]),
    reason: z.string().min(1).optional(),
  })
  .superRefine((activity, ctx) => {
    if (activity.status === "skipped" && activity.reason === undefined) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "a skipped activity needs a reason" });
    }
  });

/** A git commit's id, in full or abbreviated. */
const CommitId = z
  .string()
  .regex(/^[0-9a-f]{7,64}$/, "use a git commit id")
  .describe("A git commit's id.");

export const WorkItemIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "use letters, digits, dots, hyphens and underscores");

export const WorkItemSchema = z
  .strictObject({
    $schema: z.string().optional(),
    version: z.literal(1),
    id: WorkItemIdSchema.describe(
      "Also the file name. Tracker keys work as they are, such as PROJ-14; a GitHub issue #42 becomes GH-42.",
    ),
    title: z.string().min(1),
    kind: z.enum(["feature", "bug", "refactor", "migration", "gap", "discovery", "chore"]),
    stage: z.enum(["prepare", "build", "verify", "ship", "done", "cancelled"]),
    track: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
    base: CommitId.optional().describe(
      "The commit the item's branch started from, so its required reviews come from its own commits (RFC 0010).",
    ),
    gap: MapItemIdSchema.optional().describe("For kind gap: the map item this work fills."),
    goal: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe("What done means for this item, in a sentence or two (RFC 0005)."),
    acceptance: z
      .array(z.string().min(1).max(300))
      .max(20)
      .optional()
      .describe(
        "Criteria a tester could check: given a situation, when something happens, then a result anyone can see.",
      ),
    sources: z
      .array(Path)
      .max(10)
      .optional()
      .describe("The spec, design, requirement or issue it implements: paths in the repository, or URLs."),
    dependsOn: z.array(WorkItemIdSchema).max(20).optional().describe("Items that must reach ship before this one can."),
    activities: z.array(ActivityProgress).optional(),
    position: z
      .strictObject({ activity: z.enum(ACTIVITY_IDS), step: z.number().int().positive() })
      .optional()
      .describe("Where work stopped, so the next session resumes exactly there."),
    lastVerify: z
      .strictObject({
        result: z.enum(["pass", "fail"]),
        at: Timestamp,
        commit: CommitId.optional().describe("The commit the verify ran on (RFC 0010)."),
        ci: z
          .strictObject({ check: z.string().min(1), url: z.url() })
          .optional()
          .describe("Where the verify ran when CI ran it: the check, and its run on GitHub (RFC 0013)."),
      })
      .optional(),
    reviews: z
      .array(
        z.strictObject({
          skill: z.enum(SKILL_IDS),
          result: z.enum(["pass", "fail", "incomplete"]),
          report: Path.optional().describe("The review report the result was worked out from."),
          summary: z.string().min(1).max(500).optional(),
          unproven: z
            .boolean()
            .optional()
            .describe("Recorded without a report, so the result is the agent's word rather than proven."),
          at: Timestamp,
          commit: CommitId.optional().describe("The commit the review looked at (RFC 0010)."),
        }),
      )
      .optional(),
    requiredReviews: z
      .array(z.strictObject({ skill: z.enum(SKILL_IDS), reason: z.string().min(1) }))
      .optional()
      .describe(
        "The reviews this work needs, worked out from what the change touched when it reached verify (RFC 0004).",
      ),
    reopened: z
      .array(z.strictObject({ activity: z.enum(ACTIVITY_IDS), reason: z.string().min(1), at: Timestamp }))
      .optional()
      .describe("Earlier activities reopened for this item, such as a re-spec after a new decision."),
    next: z
      .string()
      .min(1)
      .max(200)
      .describe("One line: the next action. The fuller story lives in the goal, acceptance criteria and sources."),
    updatedAt: Timestamp,
  })
  .superRefine((item, ctx) => {
    if (item.kind === "gap" && item.gap === undefined) {
      ctx.addIssue({ code: "custom", path: ["gap"], message: "a gap work item names the map item it fills" });
    }
    if (item.kind !== "gap" && item.gap !== undefined) {
      ctx.addIssue({ code: "custom", path: ["gap"], message: "only a gap work item names a map item" });
    }
    if (item.dependsOn?.includes(item.id) === true) {
      ctx.addIssue({ code: "custom", path: ["dependsOn"], message: "a work item can't depend on itself" });
    }
  })
  .meta({
    title: "Peer AI work item",
    description: ".peer-ai/work/<id>.json: one piece of work, where it stands, and what comes next.",
  });

export type ProjectMap = z.output<typeof MapSchema>;
export type WorkItem = z.output<typeof WorkItemSchema>;
