---
name: requirements-analysis
description: Writes or updates requirements from a brief, a request or the code (people, needs, features with acceptance criteria, scope, and the data and laws that switch on rules). Use when starting a product or feature, or when requirements are missing.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: requirements
  peer-ai-templates: requirements
  peer-ai-path: docs/requirements.md
---

# Requirements analysis

Write down what the product must do, for whom, and how anyone will know it works. Every statement says where it came from. What nobody has said yet becomes a question, never a guess written as fact.

`next_work`, `project_map` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the person's words, what the project already has, and the code
- [ ] 2. Inventory: every group of people, feature, need and fact, with its source
- [ ] 3. Questions: what only a person can answer, asked together
- [ ] 4. Write: the template filled in, against the rules
- [ ] 5. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 6. Hand over: what's open, and what switches on rules
```

## 1. Sources

Read everything there is before writing anything:

- **The person's words:** a brief, an email, notes or messages they've shared. For something new, if they've shared nothing, ask for everything they have first.
- **What the project has:** call the peer-ai MCP tool `project_map`. If its `requirements` item lists a file, that's the document to update: keep everything in it that's still true. Otherwise write to `docs/requirements.md`. Read the README, and `peer-ai.config.json` for the stage, traits and where the product operates.
- **The code,** when the product exists: its screens, routes and jobs show what it does today, and what it does that nobody wrote down.
- **A single feature:** the work item from the peer-ai MCP tool `next_work`, and the requirements it changes.

## 2. Inventory

List what you found before you write. Give each item its source: the brief, a named person, a file, or the existing requirements.

| Kind | For example |
|------|-------------|
| `person` | Each group who uses the product or is affected by it: customers, staff, the people whose data is kept. People who never sign in still count. |
| `feature` | Each thing the product does or must do |
| `need` | Each need REQ-03 names: who uses it and what they need to access it, how many people and how much data, where it operates and which laws apply, how available it must be |
| `fact` | Each thing it handles that switches on rules, such as money, personal data or an AI model. See [what-switches-on-rules.md](references/what-switches-on-rules.md). |
| `dependency` | Each thing it needs from people or systems the team doesn't control |

Mark each item **stated**, when someone said it, or **inferred**, when you worked it out from the code or by reasoning. Only what's stated is a requirement. An inferred item is written as inferred, and becomes a question.

## 3. Questions

Turn everything unclear into concrete questions: "Can a customer move a booking, and until when?", not "What about changes?". If the person is there, ask them all at once and wait. Whatever stays unanswered goes under Open questions, with who can answer it. Where work can't wait for the answer, add an assumption, and what changes if it's wrong.

## 4. Write

Copy the [template](assets/requirements.md) and fill in every part. The rules are REQ-01 to REQ-04, in [rules.md](references/rules.md). [writing.md](references/writing.md) shows each part done well and done badly.

- **REQ-01:** each group of people, and the problem it has today.
- **REQ-02:** every feature in scope has acceptance criteria a tester could check: given a situation, when something happens, then a result anyone can see. "Fast", "easy" and "secure" need a number or a check.
- **REQ-03:** the needs, with numbers where someone gave them, and a question where nobody has.
- **REQ-04:** only what someone agreed is in scope. Ideas beyond it are out of scope, for the backlog. What could go either way is unclear.

Hold every part to this bar:

- **Say where each statement came from,** such as "(brief)", "(Ada, 3 March)", "(from the code: bookings/routes.ts)" or "(assumed)".
- **Say what, not how.** Requirements say what the product must do and why. How it's built belongs to the architecture and the specs, which come next.
- **When updating,** keep what's still true, change what isn't, and say under Sources what changed and why.
- **Cite only real rules:** those in rules.md, or returned by the peer-ai MCP tool `standards_for_file`.
- **Anything only a lawyer or a regulator can settle** is an open question for them, not a conclusion.

## 5. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `requirements-analysis` and the document's path. It names missing and empty parts, template text left in, and rule ids that don't exist. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill requirements-analysis` instead.

## 6. Hand over

Tell the person, in a few lines:

- where the document is, and what changed;
- the open questions only they, or someone they know, can answer;
- the facts that switch on rules, as changes to `peer-ai.config.json`, such as the trait `money` or `"compliance": { "jurisdictions": ["NG"] }`. Offer to make them; don't change the config without asking.

The usual next steps are the architecture, and a product spec for each feature.
