# Evals

An eval tests whether a review finds the problems it should, and whether a document skill writes what a good document contains. Each practice project in [`fixtures/`](../fixtures/) has problems planted in it on purpose, and its answer sheet lives here, outside the project, so the AI tool under test never sees the answers. The design is in [RFC 0002](../rfcs/0002-review-reports-and-evals.md) and [RFC 0004](../rfcs/0004-how-a-skill-is-written.md).

| Answer sheet | Practice project | Planted problems | Document scenarios |
|--------------|------------------|------------------|--------------------|
| [`courier.json`](courier.json) | [`courier`](../fixtures/courier/): a parcel pickup service, with a React web app and a Python API | 25: 24 planted, and 1 a review found that nobody planted | requirements-analysis: a change request. threat-model. |
| [`shelf.json`](shelf.json) | [`shelf`](../fixtures/shelf/): a book-lending phone app in React Native, half rebuilt | 24: 21 planted, and 3 that reviews found and nobody planted | threat-model |
| [`sprout.json`](sprout.json) | [`sprout`](../fixtures/sprout/): a plant-care journal that works offline, with an AI feature | 14 | requirements-analysis: from the code. threat-model. |
| [`refill.json`](refill.json) | [`refill`](../fixtures/refill/): a new product with only a founder's brief | – | requirements-analysis: from a brief |

## Running one

```bash
node scripts/eval.ts courier --skill security-review
```

It makes a fresh copy of the project with Peer AI's skills installed, as `peer-ai render` would, asks the AI tool for the review in plain words, collects the report the tool writes, and marks it against the answer sheet. The copy's log shows whether the tool used the skill.

| Option | What it does |
|--------|--------------|
| `--tool codex` | Use Codex instead of Claude Code |
| `--model <model>` | Ask for a model, such as a fast one and a strong one. RFC 0004 asks for both on each tool. |
| `--baseline` | Run without the skill, and tell the tool where the report format is, to measure what the skill adds |
| `--grader codex` | For a document: the tool that grades it, Codex by default. `--grader-model <model>` asks for a model. |
| `--runs 2` | Run it twice |
| `--record` | Add the result to the tables below |

Each run uses about $1 to $3 of the tool's usage.

## How a review is marked

- A planted problem counts as **found** when the report names a problem within three lines of it, at a severity no more than one level away.
- Problems the report raises that aren't on the answer sheet are listed **for a person to judge**. A real problem nobody planted is added to the answer sheet; a wrong one counts against the review.
- A review is **ready** when it finds every planted critical and high problem, and at least 80% of the medium ones, in a valid report.
- **Rules covered** counts how many of the rules the skill answers for have a line in the report. A review with the skill must cover them all; that's the proof a baseline can't give.

## How a document is marked

```bash
node scripts/eval.ts refill --skill requirements-analysis
```

A document skill's scenario is a prompt, such as a founder's brief, and the points a good document makes of it. After the run:

- **`check_document`** checks the document against the skill's template.
- **A grader,** a second run of an AI tool, reads only the document and the points. For each point it says whether the document makes it, with a quote. It never sees the project or the first run.
- **A person reads the quotes,** because a grader can be wrong. A wrong grade is corrected in the notes below.
- A document is **ready** when `check_document` accepts it, it makes every point marked as one it must make, and at least 80% of all its points.

A baseline, without the skill, can't follow a template it doesn't have, so `check_document` refuses it. Compare the points it makes instead.

## Each answer sheet

A planted problem is found in its file by a short piece of the exact code, not by line number, so the answers can't quietly drift when a file changes. A test fails if that code is ever changed or removed.

## What people judged

- **2026-09-28, courier, security-review, Claude Code.** This was a baseline, before Peer AI's own review skills exist. Of the 6 problems it raised that weren't on the answer sheet:
  - **One was real and nobody had planted it:** session tokens never expire. It's now D19 on the answer sheet.
  - **One was a planted problem at the wrong severity:** the migration that deletes customers' notes (D13) is critical, and the review called it medium.
  - **The other four were fair, minor points:** the login token kept in the browser's storage, no length limits on text fields, no lockfile for the web app, and no tests for who can see what.
- **2026-09-28, shelf, security-review, Claude Code.** Also a baseline. Of the 4 problems it raised that weren't on the answer sheet:
  - **One was real and nobody had planted it:** usage data goes to an analytics service with no consent or opt-out. It's now S17 on the answer sheet.
  - **The other three were fair, minor points:** API responses aren't checked for shape, the older sign-in doesn't check for a failed request, and there's no certificate pinning.
- **2026-09-28, sprout, ai-feature-review, Claude Code.** Also a baseline. All 4 problems it raised that weren't on the answer sheet were **fair points about the project's paperwork rather than its code**: no tests for the identification feature, the service's contract isn't written down, there's no threat model, and the photo transfer isn't recorded for the NDPA. None was added to the answer sheet.

- **2026-09-29, security-review with the skill, on courier, shelf and sprout.** These were the first runs of Peer AI's own skill, and each problem they showed changed the skill or the tools before the next run:
  - **Whole-project reviews skipped the report check.** A whole-project review has no work item, so nothing checked its report. Haiku wrote malformed reports that went unnoticed. `record_review` now checks a report without a work item.
  - **Consent was found in a different place.** Shelf's missing analytics consent (S17) was reported where the app sends location to analytics, not where analytics is set up. The skill now says to check a service where it's set up, and Opus then found S17. Codex still reported it at the call site, under the right rule, PRIV-04, and naming the missing consent. A person would count that as finding S17; the scorer, which matches by location, doesn't. S17's location was not moved to make those runs pass.
  - **A missing scanner was rated critical.** A missing secret scanner was reported under SEC-10, which is critical and is about a secret actually in the code. SEC-27, "Secret scanning runs on every change", now covers the scanner, at medium.
  - **Tools were read as shell commands.** Haiku read "the peer-ai `record_review` tool" as a command and ran `npx peer-ai record_review`, which was refused. Skills now say "the peer-ai MCP tool", and the build rejects the older wording. `peer-ai check-report` runs the same checks from a shell.
  - **Codex hung.** The runner left Codex's input open, and Codex waited for more until the 30-minute timeout. The runner now closes it.
- **What people judged in those runs:**
  - **Two points came up in every run with the skill:** no threat model (SEC-25) and no tests that attack the code (TEST-08). Both are real under Peer AI's rules. They're about how the projects are run, not planted code, so they aren't on the answer sheets.
  - **One was real and nobody had planted it:** on shelf, signing out only forgets the token on the phone, so the session stays valid on the server. It's now S18 on the answer sheet. The shelf runs above were scored before it was added, against 8 problems.
  - **Shelf's "credentials in the device log"** is S3 reported a second time under another rule.
  - **Courier's "refused sign-ins leave no trace"** (SEC-24) is real under the rules, and is also about practice.
  - **Codex flagged sprout's photo input as unchecked** (SEC-19). Sprout doesn't declare the uploads trait, so the rule doesn't apply there: a fair point, outside the review's scope.
- **Haiku, the fast model, isn't reliable for this review.** In Claude Code it never called the MCP tools, reached for shell commands instead, and its results changed from run to run. security-review needs a strong model.
- **A run without the skill still has Peer AI's MCP server.** Codex fetched the rules through `standards_for_file` and covered them without the skill; Claude Code didn't. So "without" measures the skill, not Peer AI as a whole.
- **Codex did as well with the skill, and faster:** 9 of 10, 7 of 8 and 3 of 3 both with it and without, in about 2.5 minutes a run rather than 3.5 to 6.
- **Rules covered** is out of 46 before SEC-27 was added, and out of 47 after. The rows are in the order the runs happened.

- **2026-09-29, code-review with the skill, on courier, shelf and sprout.** One Opus run and Codex on all three, to spare the Claude allowance:
  - **Opus on courier: 11 of 11, every rule covered.** It was first scored 10 of 11. It rated the decimal-money bug (D14) critical, as MONEY-01 says, and the answer sheet said medium: two levels apart, so the scorer didn't count it. Under RFC 0002 the rule sets the level, so D14 is now critical, and the same report, marked again, finds all 11. Its eight other findings were real under Peer AI's rules:
    - a failed booking or lookup tells the customer nothing (FE-07, FE-08);
    - tracking data is copied into the page (FE-01);
    - two tracking requests can race;
    - requests have no size limit (BE-02);
    - nothing tests the payment path (MONEY-10);
    - the tests leak into each other (TEST-07) and check a fake (TEST-04).
  - **Codex found more with the skill, but not reliably:** courier 8 of 11 with the skill against 4 without. On sprout it scored 6, 6 and 5 of 8 across three runs with the skill, each missing different problems. On shelf it missed a problem on the skill's own sweep list: a password written to the device log. Its default model on the free plan finishes in about 2 minutes where Opus takes 8. For code review, use a strong model.
- **What the code-review runs changed:**
  - **Older code was skipped.** Codex skipped shelf's older JavaScript half, with and without the skill. The skill now says to review older code too, starting from every file in scope. After that, Codex scored 7 of 11 against 6: it found one more problem in the older half, but still missed three of the five planted only there.
  - **Plain logic bugs had no rule.** A date worked out in UTC had no rule to be reported under. CODE-15, "Edge cases are handled", now covers it, and the next run found it.
  - **Two runs shared a folder.** They started in the same millisecond, and one was lost; it isn't in the table. Each run now gets its own folder.
- **Rules covered for code-review** is out of 66 before CODE-15, and 67 after.
- **2026-09-29: findings are paired with problems more fairly.** Each finding counts for one planted problem at most, and it used to take the nearest. When two findings both covered the same two problems, both took the nearer one and the other went unfound, though one finding was plainly about it. In the ai-feature-review runs, "Tool arguments from the model are used without validation" covered the date the model suggests (D24), and was counted for the parcel it cancels (D21) instead. Findings are now paired so that as many problems as possible are found, and each still counts once. Every saved run was marked again that way, against the answer sheet it ran against. Seven rows found one more problem, and they're updated in the table:
  - security-review on courier without the skill: Haiku 6 to 7 of 10, and Codex 8 to 9;
  - code-review with Codex: shelf 5 to 6 of 11 with the skill and without it, courier 7 to 8 of 11, shelf after the fix for older code 6 to 7, and sprout's third run 4 to 5 of 8.

  No result moved from not ready to ready.
- **2026-09-29, ai-feature-review with Codex, on courier, shelf and sprout, with the skill and without.** One run each, and no Opus runs, to spare the Claude allowance:
  - **With the skill, Codex found every planted problem and covered every rule:** 6 of 6, 5 of 5 and 5 of 5. The runner first marked courier 5 of 6 and shelf 4 of 5; the fairer pairing above showed that each report had a finding about the problem it seemed to miss.
  - **Without the skill, it found 4 of 6, 3 of 5 and 5 of 5.** It missed the staff discount code written into courier's instructions (D22), the limits on courier's model call (D25), shelf's guess at a book's suitable age shown as fact (S22), and the limits on shelf's librarian call (S23). Its findings named rules it made up, such as "prompt-injection-and-untrusted-input", rather than Peer AI's.
  - **Each run took about 3 to 4 minutes,** with or without the skill.
- **What people judged in those runs:**
  - **One was real and nobody had planted it:** shelf's request helper for its newer features has no timeout, so a slow API leaves a screen waiting. code-review raised it too. It's now S24 on the answer sheet, for code-review and reliability-review. The code-review rows above were marked before it was added, against 11 problems.
  - **Courier's "no tests of the assistant's behaviour, or of attacks on it"** (AI-08) is real under the rules, and is about how the project is run rather than planted code, like SEC-25 and TEST-08 before.

## Results

Newest last.

The Skill column says whether the run had the skill: without it (a baseline), used, or installed but not used.

| Date | Project | Review | Tool | Model | Skill | Found | Rules covered | Not on the sheet | Result | Cost |
|------|---------|--------|------|-------|-------|-------|---------------|------------------|--------|------|
| 2026-09-28 | courier | security-review | Claude Code | default | without | 9 of 9 | – | 6 | Ready | $2.49 |
| 2026-09-28 | shelf | security-review | Claude Code | default | without | 7 of 7 | – | 4 | Ready | $2.24 |
| 2026-09-28 | sprout | ai-feature-review | Claude Code | default | without | 5 of 5 | – | 4 | Ready | $1.70 |
| 2026-09-29 | courier | security-review | Claude Code | opus | used | 10 of 10 | 46 of 46 | 3 | Ready | $3.19 |
| 2026-09-29 | sprout | security-review | Claude Code | opus | without | 3 of 3 | 0 of 46 | 2 | Ready | $1.80 |
| 2026-09-29 | shelf | security-review | Claude Code | opus | used | 7 of 8 | 46 of 46 | 4 | Not ready | $2.28 |
| 2026-09-29 | sprout | security-review | Claude Code | opus | used | 3 of 3 | 46 of 46 | 3 | Ready | $2.94 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | used | 0 of 10 | 0 of 46 | 0 | Not ready | $0.24 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | used | 6 of 8 | 33 of 46 | 3 | Not ready | $0.36 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 0 of 3 | 0 of 46 | 0 | Not ready | $0.45 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | without | 0 of 8 | 0 of 46 | 0 | Not ready | $0.14 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | without | 7 of 10 | 0 of 46 | 1 | Not ready | $0.20 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | without | 2 of 3 | 0 of 46 | 3 | Not ready | $0.29 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 0 of 3 | 0 of 46 | 0 | Not ready | $0.24 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | used | 7 of 10 | 46 of 46 | 1 | Not ready | $0.31 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | used | 8 of 8 | 46 of 46 | 4 | Ready | $0.52 |
| 2026-09-29 | shelf | security-review | Claude Code | opus | used | 8 of 8 | 46 of 46 | 6 | Ready | $3.32 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 0 of 3 | 0 of 46 | 0 | Not ready | $0.24 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | used | 0 of 8 | 0 of 47 | 0 | Not ready | $0.29 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | used | 0 of 10 | 0 of 47 | 0 | Not ready | $0.29 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 3 of 3 | 47 of 47 | 3 | Ready | $0.43 |
| 2026-09-29 | sprout | security-review | Claude Code | opus | used | 3 of 3 | 47 of 47 | 3 | Ready | $3.08 |
| 2026-09-29 | courier | security-review | Codex | default | used | 9 of 10 | 47 of 47 | 1 | Not ready | – |
| 2026-09-29 | shelf | security-review | Codex | default | used | 7 of 8 | 47 of 47 | 4 | Not ready | – |
| 2026-09-29 | sprout | security-review | Codex | default | used | 3 of 3 | 47 of 47 | 4 | Ready | – |
| 2026-09-29 | courier | security-review | Codex | default | without | 9 of 10 | 47 of 47 | 1 | Not ready | – |
| 2026-09-29 | shelf | security-review | Codex | default | without | 7 of 8 | 47 of 47 | 4 | Not ready | – |
| 2026-09-29 | sprout | security-review | Codex | default | without | 3 of 3 | 47 of 47 | 2 | Ready | – |
| 2026-09-29 | shelf | code-review | Codex | default | used | 6 of 11 | 66 of 66 | 2 | Not ready | – |
| 2026-09-29 | sprout | code-review | Codex | default | used | 6 of 8 | 66 of 66 | 1 | Not ready | – |
| 2026-09-29 | courier | code-review | Claude Code | opus | used | 11 of 11 | 66 of 66 | 8 | Ready | $2.78 |
| 2026-09-29 | courier | code-review | Codex | default | without | 4 of 11 | 0 of 66 | 1 | Not ready | – |
| 2026-09-29 | shelf | code-review | Codex | default | without | 6 of 11 | 66 of 66 | 2 | Not ready | – |
| 2026-09-29 | sprout | code-review | Codex | default | without | 7 of 8 | 66 of 66 | 0 | Not ready | – |
| 2026-09-29 | courier | code-review | Codex | default | used | 8 of 11 | 66 of 66 | 0 | Not ready | – |
| 2026-09-29 | shelf | code-review | Codex | default | used | 7 of 11 | 66 of 66 | 3 | Not ready | – |
| 2026-09-29 | sprout | code-review | Codex | default | used | 6 of 8 | 66 of 66 | 0 | Not ready | – |
| 2026-09-29 | sprout | code-review | Codex | default | used | 5 of 8 | 67 of 67 | 0 | Not ready | – |
| 2026-09-29 | courier | ai-feature-review | Codex | default | used | 6 of 6 | 14 of 14 | 1 | Ready | – |
| 2026-09-29 | shelf | ai-feature-review | Codex | default | used | 5 of 5 | 14 of 14 | 1 | Ready | – |
| 2026-09-29 | sprout | ai-feature-review | Codex | default | used | 5 of 5 | 14 of 14 | 0 | Ready | – |
| 2026-09-29 | courier | ai-feature-review | Codex | default | without | 4 of 6 | 14 of 14 | 0 | Not ready | – |
| 2026-09-29 | shelf | ai-feature-review | Codex | default | without | 3 of 5 | 14 of 14 | 0 | Not ready | – |
| 2026-09-29 | sprout | ai-feature-review | Codex | default | without | 5 of 5 | 14 of 14 | 0 | Ready | – |

## Document results

Newest last. **Points** is how many of the scenario's points the grader found in the document, and **Must-haves** how many of those it must make. **Check** is whether `check_document` accepted it.

| Date | Project | Document | Tool | Model | Skill | Points | Must-haves | Check | Result | Grader | Cost |
|------|---------|----------|------|-------|-------|--------|------------|-------|--------|--------|------|
