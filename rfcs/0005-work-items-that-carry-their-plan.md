# RFC 0005: Work items that carry their plan

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #NNN |

## Summary

A work item gains four optional fields: its **goal**, its **acceptance criteria**, the **sources** it implements, such as a spec, and the items it **depends on**. The issue-planning skill uses them to turn a spec or a set of gaps into small work items that each say what done means. The build and review skills then work from the item itself, and `next_work` stops offering an item whose dependencies aren't ready.

## Motivation

RFC 0004 makes issue-planning a work skill: its output is work items, checked by their own gates. Writing it showed that a work item can't hold a plan:

- **No criteria.** A work item has a title, a kind, a track and one line of next action. The acceptance criteria a spec gives a feature have nowhere to go, so the agent building it has to find the spec again, or guess.
- **No link to its source.** Nothing says which spec, design or requirement an item implements. A review can't check the change against what was asked for.
- **No order.** Splitting a feature gives items that must land in order, such as the data change before the screen. Nothing records that, so `next_work` can offer the screen first.

The evals for the plan skills showed the same need from the other side: a product spec and a system design each end with work to do, and each skill could only describe it in prose.

## Design

### 1. The fields

Added to the work item schema, all optional, so existing items stay valid:

```ts
goal: z.string().min(1).max(500).optional()
  .describe("What done means for this item, in a sentence or two."),
acceptance: z.array(z.string().min(1).max(300)).max(20).optional()
  .describe("Criteria a tester could check: given a situation, when something happens, then a result anyone can see."),
sources: z.array(z.string().min(1)).max(10).optional()
  .describe("The spec, design, requirement or issue it implements: paths in the repository, or URLs."),
dependsOn: z.array(WorkItemId).max(20).optional()
  .describe("Items that must reach ship before this one starts building."),
```

### 2. The tools

- `create_work_item` and `update_work_item` accept the four fields.
- `next_work` returns them for the current item, and marks an open item **blocked** while any item it depends on hasn't reached `ship`.
- `advance_work_item` refuses to move an item to `build` while it's blocked, and names the items it's waiting for.
- `peer-ai check` fails when `dependsOn` names an item that doesn't exist, or when items depend on each other in a loop.

### 3. The issue-planning skill

It reads a product spec, a system design, the requirements or the gaps on the project map, and creates the work items to deliver them:

- **Small slices.** Each item is one change a person could review in one sitting, and one pull request. A slice cuts through the layers it needs, rather than one item per layer.
- **Criteria from the source.** Each item carries the acceptance criteria it must meet, copied from the spec or written from the design, and names its sources.
- **Order.** Dependencies are recorded, and only where they're real.
- **Nothing twice.** Open items are read first, and an item already covering a slice is updated rather than duplicated.
- **The tracker.** When `tracker.kind` is `github`, `gitlab`, `linear` or `jira`, the skill offers to create matching issues and records each issue's key as the item's id. It never creates them without the person agreeing, since that publishes the plan.

Its evals give a spec and grade the work items created, by the same grader and points as document evals (RFC 0004 amendment of 29 September 2026), with the items written out as a document for the grader.

## Compatibility

A minor change. The fields are optional and additive; existing work items and tools are unaffected until an item uses them. The one new refusal, moving a blocked item to `build`, applies only to items that declare dependencies.

## Drawbacks

- **More to keep current.** Criteria on an item can drift from the spec. `sources` makes the drift findable, and the reviews check the change against the spec as well.
- **A dependency can block work that could safely start.** A person can remove the dependency, and `advance_work_item` says which one blocks.

## Alternatives

- **Keep the plan in the tracker only.** Many projects have no tracker, and the agent would need a tracker integration to read criteria back. The work item is the one place every tool already reads.
- **A plan document per feature.** It would hold criteria, but nothing would link each item to its part of the document, and `next_work` couldn't order the items.

## Open questions

- Should `implement-ticket` record, for each criterion, the test that proves it? That belongs with the build skills, and may need its own field.
