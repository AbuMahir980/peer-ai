# RFC 0016: Proportionate reviews

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #182 |

## Summary

Every review a change needs runs the whole skill, with a coverage line for every rule the skill answers for, whatever the change's size. That's right for a new feature, and far too much for a one-line type change in two screens. On a real project, people started asking whether reviews were needed at all, which is how reviews get skipped. This RFC keeps every required review, and sizes it to the change:

- A review of a change answers only for the rules that can apply to the files it changed, worked out the way `standards_for_file` works them out (RFC 0012).
- A weak trigger asks for a light review: the changed lines, against those rules, in a short report.
- A person can waive a required review for one item, with a reason. The record keeps the waiver, and `peer-ai check` lists it.
- Before a whole-project review starts, the skill gives a rough cost and asks.

## Motivation

From the first project to use 1.0 every day:

- **One size for every review** (#111). A one-line type change in two screens triggered a full accessibility review, with a coverage line for every accessibility rule. A pre-launch audit of one backend, by three agents running two skills each, used roughly 1.5 million tokens. That was worth it once, before a launch, but at that weight per change, the person running the project asked whether the reviews were needed.
- **Weak triggers get the full review** (#109). A change of CI settings, build files, a dependency bump and a few backend lines was asked for eight reviews. RFC 0010 stopped a formatter's whitespace-only changes from triggering any, which removed three of the eight. What's left: a trigger that's real but small, such as one type changed in a screen, still asks for the whole review, with no lighter option and no way to say it isn't needed.

## Design

### 1. A review answers for the rules that can apply to its change

For a review of a work item, `record_review` and `peer-ai check-report` now require coverage only for the rules that can apply to the files the change touched, not for every rule in the skill's `rules.md`:

- **The applicable set** is the union of the rules `standards_for_file` gives for each file the branch changes (RFC 0012), by kind and language, at the project's stage and traits, within the skill's own rules.
- **`next_work` gives the set** with the required review, as `rules`, so the agent knows what to answer for before it starts.
- **A rule outside the set needs no line.** A line for it is still accepted.
- **A whole-project review** still answers for every rule, since its scope is everything.

### 2. A light review for a weak trigger

A required review is **light** when its trigger is weak: the files that triggered it changed by 20 lines or fewer, with no new file among them, and none of them is a route, a migration, a permission check or a workflow. `requiredReviews` records the depth: `{ "skill": "accessibility-review", "reason": "…", "depth": "light" }`.

A light review:
- inventories only the changed hunks, not the screens or routes around them;
- answers for the applicable rules those hunks can break;
- writes the same report format, with `"depth": "light"`.

Each review skill gains a short "Light review" section saying how. The gate accepts a light review for a light requirement, and a full one for either.

### 3. A waiver with a reason

A person can decide that one item doesn't need a review it was asked for: `update_work_item` with `waive: { skill, reason, by }`, or `peer-ai waive <item> <skill> --reason "…"` from a terminal.

- **The item records it,** and the gate accepts it in place of the review.
- **`peer-ai check` lists every waiver** on items at ship or done, with its reason and who decided, so nothing is skipped silently.
- **At the production stage,** only a light requirement can be waived. A full review there needs doing, or the project-wide choice in `activities.verify.reviews.remove` (RFC 0004), which is for reviews a project never needs.

### 4. A rough cost before a whole-project review

Before a whole-project review starts, its skill calls `project_map`, which now gives each skill's rough scope:
- the files and lines in scope;
- the rules it answers for;
- an estimate of its size, from those, as small, medium or large, with the token range each means.

The skill tells the person, and asks whether to run it whole, for one part, or not now. The estimate is rough, and says so.

## Compatibility

Minor:

- `requiredReviews` entries gain `depth`. A report gains `depth`, and a work item gains `waived`.
- `next_work`'s reviews gain `rules`, and `project_map` gains review sizes.
- A new command arrives: `waive`.
- Review skills gain a "Light review" section, and the whole-project reviews gain the cost step.

A report recorded before this is accepted as it was. Its extra coverage lines are still valid.

## Drawbacks

- **A smaller set can miss a rule** that applies through a file the change didn't touch, such as a screen whose shared component changed. The skills already say to follow a change to what it calls and what calls it, and the applicable set includes those files' rules when the agent adds them to the inventory.
- **"Weak" is a line drawn by size and kind.** Twenty lines in a payment handler isn't weak, which is why routes, migrations, permission checks and workflows never count as weak.
- **A waiver can become a habit.** `check` lists every one, with who decided, and production allows only light ones.

## Alternatives

- **A review per changed hunk, always.** Cheapest, but a review of one hunk can't see what the change means for the screen or the route as a whole, which is what full reviews are for.
- **Fewer required reviews.** Dropping a review for small changes loses its evidence entirely. A light review keeps it, at a fraction of the cost.
- **A token budget per review.** It stops a review partway, leaving it incomplete. Sizing the review to the change keeps it complete.

## Open questions

- **Is 20 lines the right line for weak?** Proposed: yes to start, as a project setting later if projects disagree.
- **Should the cost estimate use a project's past reviews,** once there are some? Proposed: yes, in a later change, since recorded reviews hold their sizes.
