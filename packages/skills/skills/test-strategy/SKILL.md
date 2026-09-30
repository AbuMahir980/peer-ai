---
name: test-strategy
description: Writes or updates the test strategy (the journeys and rules that must never break, which test proves each at which level, abuse tests, test data, what runs on every change, and the gaps). Use when a product has few tests, or before a release.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: testing
  peer-ai-rules: CODE-15 DEL-04 PRIV-02
  peer-ai-templates: test-strategy
  peer-ai-path: docs/test-strategy.md
---

# Test strategy

Write down how the product is tested: what matters most, the test that proves each thing at the level where it belongs, what runs on every change, and the tests that should exist and don't. Reviews and builds use it to decide what a change must test, so it names real journeys, rules and files, not intentions.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the requirements, the specs, the architecture, the code and its tests
- [ ] 2. Inventory: every test, main journey, business rule, boundary and place tests run
- [ ] 3. Rules: what the testing rules ask of this product, at its stage
- [ ] 4. Write: the template filled in, with the gaps found
- [ ] 5. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 6. Hand over: the gaps, most serious first, as work to do
```

## 1. Sources

- **What the product must do:** call the peer-ai MCP tool `project_map`, and read the requirements and specs it finds. The main journeys come from them, and the business rules from them and the code.
- **What's tested now:** the map's `tests` item lists the test files in each part. Read them. Read the verify command in `peer-ai.config.json` and the CI configuration: what runs, for which parts, and whether a failure blocks a merge.
- **What's risky:** the threat model, the architecture (every outside service and store), and the project's traits, such as `money`, `offline` or `ai-features`. Each adds tests the product needs.
- **Where to save:** `docs/test-strategy.md`, unless the project keeps it elsewhere. Update an existing strategy rather than starting again, and keep every decision a person made in it.

With few tests or none, the strategy is still written, from the requirements and the code. Don't stop to wait for answers: mark what you propose as proposed, put each question under Open questions with who can answer it, and ask the person when you hand over. Their answers update the strategy.

## 2. Inventory

List from the code and the documents, with an id, a kind and where it is:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `test` | `test:slots` | Each test file: what it proves, and at which level |
| `journey` | `journey:book-a-repair` | Each main journey a person takes through the product |
| `rule` | `rule:slot-capacity` | Each business rule that must hold, such as a calculation, a limit or a change of state |
| `boundary` | `boundary:payment-provider` | Each outside service, database, store on a device, or other part the code talks to |
| `run` | `run:verify` | Each place tests run: the verify command, each CI job, a schedule |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for a file in each part. The testing rules it returns say what the strategy must plan for at the product's stage. Each one gets a line under Rules this stage asks for: the test that meets it, the gap, or the check planned and when it runs. A rule that applies from a later stage goes in the strategy as planned for that stage, not as a gap now.

## 4. Write

Copy the [template](assets/test-strategy.md) and fill in every part. [levels.md](references/levels.md) says which level each kind of check belongs at.

- **Names, not categories.** Each journey, rule and boundary by name, with the test that proves it, such as "Slot capacity: slots.test.ts:40 refuses a booking for a full slot", or "none yet". "Business rules are unit tested" is a wish, not a strategy.
- **Check what the tests really do.** A test that exists but asserts nothing about its rule, or that no command ever runs, isn't coverage. Say so.
- **Every part, every platform.** Each part of the product gets its tests, and the strategy says what runs for each. A part whose tests never run is a gap. A product that ships to several platforms, such as two phone systems or several browsers, runs its main journeys on each: name the platforms against every journey. Shared code still runs on each platform's own system, with its own permissions, keyboard, screen reader and storage, so a journey proven on one isn't proven on another.
- **Gaps as work.** Each missing or weak test is a gap, with the test that would close it, described well enough to write: what it sets up, what it does and what it checks. Give its level and the risk while it's missing, most serious first. A gap without its test is a worry, not a plan.
- **Say where each fact came from:** a test file, the verify command, a document, or proposed by you.

## 5. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `test-strategy` and the document's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill test-strategy` instead.

## 6. Hand over

Tell the person, in a few lines: where the strategy is, the most serious gaps first, and the open questions. Offer to turn the gaps into work items.
