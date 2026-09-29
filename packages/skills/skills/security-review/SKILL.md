---
name: security-review
description: Reviews code for security holes and personal-data leaks against Peer AI's OWASP-based rules, proving each was checked. Use for a security review or audit, or when changing sign-in, permissions, input, secrets or personal data. Not for code review.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: security privacy-compliance
  peer-ai-rules: REL-03 REL-04 REL-05 DEL-07 TEST-08 MOB-01 MOB-02 MOB-03 MOB-04 MOB-05 AI-01 AI-03 AI-04 AI-06
---

# Security review

Check the code in scope against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's change, or the whole project
- [ ] 2. Inventory: every way in, and everything worth protecting
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review what its branch changed (`git diff --name-only <base>...HEAD`), and read the unchanged code a rule depends on, such as the middleware that checks a changed route's permissions.
- **The whole project:** every part on the map from the peer-ai MCP tool `project_map`, except external and dormant ones.

Read these first where they exist, and list them in the report's `inputs`: the threat model, the architecture, and the rules the project has set aside (`standards.exceptions` in `peer-ai.config.json`).

Review the code that runs, and the configuration that ships with it. Tests, examples and developer tools are out of scope, except where a rule is about them (PRIV-02, TEST-08, DEL-07).

## 2. Inventory

List everything an attacker can reach and everything worth protecting. Take it from the code, not from file names, and give each item an id, a kind and its file and line.

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `route` | `route:GET /orders/{id}` | HTTP endpoints, GraphQL fields, RPC methods |
| `event` | `event:order.updated` | Live events and queue consumers |
| `webhook` | `webhook:payments` | Calls in from outside services |
| `job` | `job:nightly-export` | Scheduled and background work |
| `screen` | `screen:sign-in` | Screens that handle sign-in, payment, uploads or personal data |
| `link` | `link:app://item` | Deep links and app links into a phone app |
| `upload` | `upload:avatar` | Every place a file comes in |
| `permission` | `permission:location` | Each device permission a phone app asks for |
| `service` | `service:analytics` | Each outside service that receives personal data: analytics, AI models, payment providers |
| `secret` | `secret:PAYMENT_API_KEY` | Each secret the code reads |
| `store` | `store:customers` | Tables, buckets and on-device stores holding personal or sensitive data |
| `config` | `config:cors` | CORS, headers, TLS, session and cookie settings |

Find routes where the framework registers them: a router, controller decorators or a routes file. A route missing from the inventory is a route nobody checked.

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. For a whole project, one file from each part is enough. It returns the rules that apply at the project's stage and traits, with the stack profile's and the project's own.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the rules that don't apply here. The line says why.

## 4. Check

Work through each group. Its reference says what to look for, what counts as evidence for a pass, and the usual false alarms.

| Rules | Reference |
|-------|-----------|
| SEC-01 to SEC-04, SEC-14, SEC-21: who may do what | [access-control.md](references/access-control.md) |
| SEC-05 to SEC-09, SEC-22: what comes in and what goes out | [input-and-output.md](references/input-and-output.md) |
| SEC-10, SEC-11, SEC-26, SEC-27, REL-04, REL-05, DEL-07: secrets and configuration | [secrets-and-config.md](references/secrets-and-config.md) |
| PRIV-01 to PRIV-06: personal data | [personal-data.md](references/personal-data.md) |
| SEC-12, SEC-13, SEC-24, REL-03: guessing, abuse and security logs | [abuse-and-logging.md](references/abuse-and-logging.md) |
| SEC-15 to SEC-20, SEC-23: transport, browsers and files | [transport-and-files.md](references/transport-and-files.md) |
| SEC-25, TEST-08: the threat model and abuse tests | [threat-model-and-tests.md](references/threat-model-and-tests.md) |
| MOB-01 to MOB-05: phone apps | [mobile.md](references/mobile.md) |
| AI-01, AI-03, AI-04, AI-06: features that use AI models | [ai-features.md](references/ai-features.md) |

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "orders.ts:43 loads the order by its id and the caller's user id". "Looks fine" isn't evidence, and neither is a comment claiming the check exists.
- **A failure is a finding:** the harm in plain words, the file and line, what shows it's real, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every item, not a sample.** A rule about each route is checked on each route.
- **Only what the code shows.** When the proof lives where you can't see it, such as a hosting platform's settings or another repository, the line is `not-checked` with that reason. Note what an attacker can't do as well, so nothing is overstated.
- **Deployed, not local.** TLS, HSTS and secure cookies are judged on the production configuration, not on settings for local development.
- **Tool-checked rules still get a line.** For a rule a tool checks, such as SEC-07 or SEC-10, a pass cites the tool running in CI, and any violation you see is still a finding.
- **A real problem no rule covers** goes in the summary, with the rule it suggests. Every finding cites a rule.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/security-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `security-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `security-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way. Don't skip this step, even when you're sure the report is right.

Then tell the person in a few lines: the result, each finding's severity and title, and what wasn't checked and why. Offer to turn the findings into work items.
