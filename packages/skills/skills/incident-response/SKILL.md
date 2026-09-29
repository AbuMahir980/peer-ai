---
name: incident-response
description: Handles a production incident from first report to lessons learned (how bad it is, containing it first, a timeline, who must be told, the cause, a fix with a test, a blameless review and a runbook). Use when something is wrong in production.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: work
  peer-ai-rules: OPS-11 OPS-13 OPS-14 TEST-01 SEC-24
---

# Incident response

Something is wrong in production and people are affected. Stop the harm first, then find out why, fix it properly, and make sure it can't happen the same way again. Keep a record as you go, so the people deciding and the people affected can trust what they're told. The incident plan (OPS-11) says who leads and who decides; this skill does the work alongside them.

`next_work`, `project_map`, `create_work_item`, `update_work_item`, `standards_for_file` and `run_verify` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that runs in a shell is `npx peer-ai check`.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Take stock: what's happening, since when, to whom, and how bad
- [ ] 2. Contain: the quickest safe step that stops more harm
- [ ] 3. Timeline: what was seen and done, and when, from the start
- [ ] 4. Tell: who must know, inside and outside, and by when
- [ ] 5. Cause: the change or condition behind it, and why nothing caught it
- [ ] 6. Fix: the proper fix, with a test that would have caught it
- [ ] 7. Learn: a blameless review, follow-up work items, and a runbook
```

## 1. Take stock

- **What's happening:** from the report, the logs and the code: what people see, since when, and what changed around then, such as the last release.
- **How bad:** who is affected and how many; whether people's data was exposed, changed or lost; whether money moved wrongly; whether it's still happening. Say it plainly at the top of the record.
- **Open it:** create an incident work item with the peer-ai MCP tool `create_work_item`, kind `bug`, with what's known and the next action. Keep it current with `update_work_item` at every step, so anyone can pick up where you are.

Don't stop to wait for answers. Record each question, with who can answer it, and carry on with what you can do safely.

## 2. Contain

Stop more harm before anything else, with the smallest safe step that works now: undo the release that caused it (OPS-14), switch the feature off, or block the path being abused. Say which you chose and why, and what it costs people while it's in place.

[containing.md](references/containing.md) lists the usual moves and their costs.

Never destroy evidence while containing: keep the logs, the data as it is, and the affected records, before changing anything.

## 3. Timeline

Write `docs/incidents/<yyyy-mm-dd>-<short-name>.md` as you go, starting with the timeline: each time, what was seen, and what was done, including this session's own steps. Times are real, with their time zone. Anything you infer is marked as inferred.

## 4. Tell

- **Inside:** whoever leads incidents in the plan, and the owners of anything affected.
- **The people affected:** what happened to them, what's been done, and what they should do, in plain words, once the facts are sure.
- **Outside, by law:** when people's personal data was exposed, changed or lost, data protection laws commonly require telling the regulator, and sometimes the people, within a set time. Name the likely law for where the product operates, from `compliance` in `peer-ai.config.json`, and its deadline, as a question for someone qualified to decide, never as a conclusion.

Draft the messages; a person sends them.

## 5. Cause

Find what caused it, from the change history, the code and the logs: the smallest change or condition that explains everything seen. Then find why nothing caught it: the missing test, review, check or alert. Both go in the review.

## 6. Fix

The proper fix goes through the normal way of working: a work item with acceptance criteria, built with a test that fails without the fix and passes with it (TEST-01), verified with the peer-ai MCP tool `run_verify`, and reviewed. Use the implement-ticket skill when it's installed. Undo any containing step once the fix is live, and say when.

Repair what the incident broke, too, where it can be repaired: records changed wrongly, or data that can be recovered from a backup. Anything that can't be recovered is said plainly in the review.

## 7. Learn

- **The review:** complete the incident document as [review.md](references/review.md) describes: what happened, the impact, the timeline, the cause and why it wasn't caught, what helped, what didn't, and the follow-ups. Blameless: it's about the system, not a person.
- **Follow-ups:** each is a work item, created with `create_work_item`, with an owner to decide it, such as a missing test, a review that should have been required, an alert that should have fired (OPS-13), or a security event that should have been logged (SEC-24).
- **The runbook:** write or update `docs/runbooks/<kind-of-incident>.md`: how to spot this kind of incident, how to contain it, and who to call, so the next person doesn't start from nothing.

Then run `npx peer-ai check`, and tell the person in a few lines: whether harm is still happening, what was contained and how, the cause, the fix and its state, the messages waiting for someone to send, and the open questions.
