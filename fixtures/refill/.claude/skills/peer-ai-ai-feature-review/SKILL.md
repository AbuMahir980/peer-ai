---
name: peer-ai-ai-feature-review
description: Reviews features that use AI models (what's sent to a model, what can steer it, what its output can do, limits and tests) against the OWASP Top 10 for LLM apps, proving each rule was checked. Use when a change adds or changes an AI feature.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: ai-features
  peer-ai-rules: SEC-08 SEC-11 PRIV-03 PRIV-04 PRIV-05 REL-01
---

# AI feature review

Check every feature that uses an AI model against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's change, or every AI feature in the project
- [ ] 2. Inventory: every model call, what goes into it, and where its output goes
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`, and review what its branch changed (`git diff --name-only <base>...HEAD`) and the code around each model call.
- **The whole project:** every AI feature in the parts on the map from the peer-ai MCP tool `project_map`, except external and dormant ones.

Find the model calls from the code: an AI SDK, a request to a model provider, or a request to the project's own endpoint that forwards to one.

The AI rules apply to projects with the ai-features trait. If the code uses AI models but `peer-ai.config.json` doesn't declare the trait, say so at the top of the summary, and review against [rules.md](references/rules.md) anyway.

## 2. Inventory

For each model call, list what goes into it and where its output goes. Give each item an id, a kind and its file and line.

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `model-call` | `model-call:support-assistant` | Each place the code calls a model |
| `instructions` | `instructions:support-assistant` | The model's instructions, and everything joined into them |
| `input` | `input:parcel-details` | Each piece of data sent to the model, and whether it's personal |
| `tool` | `tool:cancel_parcel` | Each action the model can take, directly or by what its reply says |
| `output` | `output:reply-shown` | Each place the model's output goes: a page, the database, a decision, another call |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. It returns the rules that apply at the project's stage and traits.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here. The line says why.

## 4. Check

Work through each group. Its reference says what to look for, what counts as evidence for a pass, and the usual false alarms.

| Rules | Reference |
|-------|-----------|
| AI-03, AI-04, AI-06, SEC-11, PRIV-03 to PRIV-05: what goes into the model | [inputs-and-instructions.md](references/inputs-and-instructions.md) |
| AI-01, AI-02, AI-05, SEC-08: what the model's output can do | [outputs-and-actions.md](references/outputs-and-actions.md) |
| AI-07, AI-08, REL-01: limits and tests | [limits-and-tests.md](references/limits-and-tests.md) |

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "assistant.py:48 sends only the tracking status, not the recipient".
- **A failure is a finding:** the harm in plain words, the file and line, what shows it's real, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every model call, not a sample.** Each rule is checked against each call, instruction, input, tool and output it applies to.
- **Follow the data.** Trace each input from where it comes from to the model, and each output from the model to where it lands, so nothing slips through a helper.
- **Only what the code shows.** When the proof lives where you can't see it, such as limits set in another repository or at the provider, the line is `not-checked` with that reason.
- **A real problem no rule covers** goes in the summary, with the rule it suggests.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/ai-feature-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `ai-feature-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `ai-feature-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way. Don't skip this step, even when you're sure the report is right.

Then tell the person in a few lines: the result, each finding's severity and title, and what wasn't checked and why. Offer to turn the findings into work items.
