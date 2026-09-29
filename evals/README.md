# Evals

An eval tests whether a review finds the problems it should, and whether a document skill writes what a good document contains. Each practice project in [`fixtures/`](../fixtures/) has problems planted in it on purpose, and its answer sheet lives here, outside the project, so the AI tool under test never sees the answers. The design is in [RFC 0002](../rfcs/0002-review-reports-and-evals.md) and [RFC 0004](../rfcs/0004-how-a-skill-is-written.md).

| Answer sheet | Practice project | Planted problems | Document scenarios |
|--------------|------------------|------------------|--------------------|
| [`courier.json`](courier.json) | [`courier`](../fixtures/courier/): a parcel pickup service, with a React web app and a Python API | 36: 25 planted, and 11 found that nobody planted | requirements-analysis: a change request. threat-model. architecture: bring it up to date. product-spec. system-design. api-design: from the code. data-modelling. design-system: a first one. issue-planning. |
| [`shelf.json`](shelf.json) | [`shelf`](../fixtures/shelf/): a book-lending phone app in React Native, half rebuilt | 33: 23 planted, and 10 found that nobody planted | threat-model. architecture: bring it up to date. product-spec. system-design. api-design: a request to another repository. design-system. issue-planning. |
| [`sprout.json`](sprout.json) | [`sprout`](../fixtures/sprout/): a plant-care journal that works offline, with an AI feature | 20: 16 planted, and 4 found that nobody planted | requirements-analysis: from the code. threat-model. product-spec. system-design. data-modelling. design-system. issue-planning. |
| [`refill.json`](refill.json) | [`refill`](../fixtures/refill/): a new product with only a founder's brief | – | requirements-analysis: from a brief. architecture: propose one. api-design: from a brief. data-modelling: from a brief. |
| [`split-bill.json`](split-bill.json) | [`split-bill`](../fixtures/split-bill/): a small library whose tests run anywhere | – | implement-ticket: a planned item |
| [`split-bill-uneven.json`](split-bill-uneven.json) | `split-bill` | – | implement-ticket: an unplanned request |
| [`split-bill-waiting.json`](split-bill-waiting.json) | `split-bill` | – | implement-ticket: an item waiting on another |
| [`split-bill-qa-tip.json`](split-bill-qa-tip.json) | `split-bill`, with a tip already built | 5 | – |
| [`split-bill-qa-uneven.json`](split-bill-qa-uneven.json) | `split-bill`, with uneven splits already built | 5 | – |
| [`courier-qa-move.json`](courier-qa-move.json) | `courier`, with moving a pickup already built | 5 | – |
| [`courier-infra.json`](courier-infra.json) | `courier`, with its cloud infrastructure in Terraform | 7 | – |
| [`courier-kubernetes.json`](courier-kubernetes.json) | `courier`, deployed on Kubernetes | 5 | – |
| [`sprout-hosting.json`](sprout-hosting.json) | `sprout`, with its container, web server and deploy workflow | 5 | – |
| [`shelf-release.json`](shelf-release.json) | `shelf`, with release 3.5.0 about to go to the stores | 4 | – |
| [`courier-launch.json`](courier-launch.json) | `courier`, about to launch in production | 5 | – |
| [`split-bill-release.json`](split-bill-release.json) | `split-bill`, with version 1.3.0 about to be published | 3 | – |
| [`courier-observability.json`](courier-observability.json) | `courier` in production, with its logs, health check and alerts | 5 | – |
| [`courier-security-logs.json`](courier-security-logs.json) | `courier` in production, with sign-in and an audit log | 4 | – |
| [`shelf-monitoring.json`](shelf-monitoring.json) | `shelf`, with crash reporting | 2 | – |

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
| `--regrade <copy>` | For a document: grade an earlier run's copy again, when a grader failed or for a second opinion from another grader |
| `--document <path>` | With `--regrade`: the document to grade, when the run saved it where neither the scenario nor the project map finds it |
| (scenario) `setup`, `diff` | A scenario can write files into the copy before the run, such as a planned work item, and give the grader the run's change as a diff |
| `--runs 2` | Run it twice |
| `--record` | Add the result to the tables below |

Each run uses about $1 to $3 of the tool's usage.

## How a review is marked

- A planted problem counts as **found** when the report names a problem within three lines of it, at a severity no more than one level away.
- A problem with a **whole file, or the whole project**, such as a missing lockfile, counts as found by a finding that cites one of the problem's rules: on that file, with or without a line, or, for the whole project, anywhere.
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

- **2026-09-29, requirements-analysis with Codex, on refill, courier and sprout, with the skill and without.** A second Codex run graded each document; a person read every grade, and the corrections are below. The first six rows were graded again against the final points:
  - **With the skill, all three are ready:** refill 13 of 13, and courier 11 of 11 and sprout 11 of 11 after the fixes below. Without it: 10 of 13, 7 of 11 and 8 of 11, none ready.
  - **Without the skill, Codex put an extra idea into the agreed scope:** the loyalty scheme the operations lead added to their message. It also dropped sprout's existing requirements.
  - **The baselines still followed the template,** because Peer AI's MCP server was connected and `check_document` named the parts they were missing. As with the reviews, "without" measures the skill, not Peer AI as a whole.
- **What the runs changed:**
  - **Existing requirements were weakened.** On sprout, with and without the skill, Codex turned requirements such as "nothing may ever be lost" into intentions, because the code doesn't meet them yet. The skill now keeps every requirement a person decided, and reports the gap. The next run kept them all.
  - **A feature nobody wrote down was missed.** Courier's code has a support assistant its requirements don't mention. The skill now compares the code with the requirements both ways, and the next run asked about it.
  - **An extra idea was treated as agreed.** One courier run put the loyalty scheme in scope. The skill now says an idea added to a request isn't agreed until someone decides, and the point accepts "unclear" as well as "out of scope".
  - **A run stopped to wait.** One courier run asked its questions, then waited for answers nobody would give, and wrote nothing. The skill now writes the document with its questions in it, and asks at hand-over. The next run made every point.
  - **The runner:** Codex wouldn't grade outside a git repository until told it's fine; `--regrade` grades an earlier run's copy again; and a document written under the same name elsewhere, such as `requirements/requirements.md`, is found.
- **What people judged in those runs:**
  - **Two points were wrong about the projects,** and were rewritten before the re-grade. Sprout's journal, watering and plant identification are in the code but not reachable from any screen, so "describes what the app does today" can't expect them as working features. Three "invents no numbers" points now say plainly that figures from the brief are allowed.
  - **The grader was wrong once:** in the second courier run it counted "about ten minutes", from the operations lead's message, as an invented figure. A person counts that run 10 of 11; it still isn't ready, because of the loyalty scheme.
  - **The grader varies:** refill with the skill was graded 12 and then 13 of 13 on the same document, over whether it asked if a patient is charged when a prescription is rejected.

- **2026-09-29, threat-model with Codex, on courier, shelf and sprout, with the skill and without.** The first six rows were graded again after two points were corrected:
  - **With the skill, after the fixes below:** courier 13 of 13 and sprout 10 of 10, both ready; shelf 9 of 11. Without it: 10 of 13, 7 of 11 and 9 of 10, none ready.
  - **Without the skill, Codex missed what matters most on shelf:** the partner secret built into the app and the plain HTTP to the API. On courier it missed the notes shown as HTML, and cited no rules.
- **What the runs changed:**
  - **Only missing defences were listed.** Every first run listed what's missing and marked nothing in place, so a reader couldn't tell what must be kept, such as the sign-in check on courier's routes. The skill now looks as hard for defences that hold. Courier and sprout then marked theirs, with files and lines; shelf still didn't.
  - **Stopping to wait.** The skill said to wait for answers to its questions, as requirements-analysis did. It now writes them down as assumptions and asks at hand-over. No threat-model run was caught by it.
- **What people judged in those runs:**
  - **Two points were wrong about courier,** and were rewritten before the re-grade. Courier has no sign-in route: a customer is identified by a signed token, and the threat model said so correctly. The point on in-place defences was empty when none was marked; it now asks for at least one.
  - **Shelf's in-place defences are a judgement call.** Its requests carry the reader's session token, which a person would mark in place; almost everything else it has is planted as missing. The shelf run is counted as not ready.
  - **The grader varies:** the same sprout baseline was graded 7 and then 9 of 10, though only one of its points had changed.

- **2026-09-29, architecture with Codex, on courier, shelf and refill, with the skill and without.** Every row was graded after the grader was given the decision records as well as the main document:
  - **With the skill, all three are ready:** courier 10 of 10 after the fix below, shelf 8 of 9 and refill 9 of 10. Without it: 5 of 10, 8 of 9 and 7 of 10, none ready.
  - **Without the skill, courier's rules were lost:** the baseline dropped what the old document decided, and didn't flag the assistant changing parcels that another module owns. Refill's baseline gave no options for a person to decide between. Shelf's baseline made the same points as the skill, but didn't follow the template, so `check_document` refused it.
- **What the runs changed:**
  - **An existing rule was dropped.** The first courier run with the skill lost the rule that each request carries a signed session token. The skill now keeps every rule and decision the document already states, even where the code breaks it; the break goes under Risks. The next run made every point.
  - **The grader saw only the main document,** so it couldn't credit options written in a decision record. The runner now gives it every Markdown document the run wrote.
- **What people judged in those runs:**
  - **One point was wrong about refill:** its brief doesn't ask for live tracking, which the skill rightly didn't assume. The point now asks how riders see where to go, and whether patients should follow a delivery live.
  - **Shelf's storage rule was missed with the skill and without:** neither kept the rule that a change to how data is stored on the phone moves the existing data.

- **2026-09-29, product-spec with Codex, on courier, shelf and sprout, with the skill and without.** The first six rows were graded again against the final points:
  - **With the skill, all three are ready after the fixes below:** courier 10 of 11, shelf 10 of 10 and sprout 8 of 10. Without it: courier 8 of 11, and sprout 7 of 10, neither ready. Shelf's baseline saved its spec as `docs/loan-extension.md`, where the project map doesn't find a spec, so the gap it was meant to fill stayed open.
- **What the runs changed:**
  - **Another way to do the same thing was missed.** Courier's assistant can already cancel parcels, and the first spec didn't say how the two must agree. The skill now looks for another path that does the same thing, but the next courier run still didn't mention the assistant: a gap that remains.
  - **Who else is affected.** Shelf's first spec didn't say whether the lender is told about an extension. The skill now asks who each change affects, and how they find out.
  - **Phones.** The skill now covers text size and touch targets, which shelf's first spec left out.
  - **Undoing a mistake.** Sprout's specs didn't say how a person undoes watering recorded by accident. The skill now asks for it where a mistake can happen, and the next run covered it.
  - **The runner** now finds a document wherever the project map finds it, such as `docs/plant-watering-spec.md`, so a baseline isn't marked down only for its folder.
- **What people judged in those runs:**
  - **A point was misread:** "leaves tables to the system design" meant database tables, and the grader counted the spec's own tables. The points now say database tables.
  - **The grader is strict about storage:** it counted "the data stays on the device" as a storage detail in sprout's last run. A person would count that point as made.
  - **One re-grade lost its grades:** the grader said it wrote them, and the file wasn't there. It was graded again.

- **2026-09-29, system-design with Codex, on courier, shelf and sprout, with the skill and without.** Every row was graded against the final points:
  - **With the skill:** courier 10 of 10 and shelf 7 of 8, both ready, after the fixes below. Sprout's run made 7 of 8, missing the test for a watering just before midnight.
  - **Without the skill, no design was saved where the project map finds a spec:** each went to `docs/<feature>-design.md`, so the gap stayed open. Graded where they were saved, with `--document`, they made 7 of 10, 5 of 8 and 7 of 8, none ready. Shelf's baseline designed the other repository's API from the inside.
- **What the runs changed:**
  - **Another path to the same data.** Courier's first design didn't route the assistant's cancel through the parcels module. The skill now finds every existing path that does the same thing, and routes them through the data's one owner. The next courier run made every point.
  - **Another repository's insides.** Two of shelf's designs were graded as describing the other repository's transactions and locks, the second after the skill said not to. The rule now sits where the template invites a design, in the Data, Two at once and Failures parts, and asks for guarantees instead. The next shelf run was ready.
  - **The runner:** `--document` grades a file a run saved where nothing else finds it, and a grader that writes no valid grades is asked once more. Two baselines' grades were lost to that before the fix.
- **What people judged in those runs:**
  - **The grader varies:** sprout's first run was graded 8 of 8, and 7 of 8 when graded again.

- **2026-09-29, api-design with Codex, on courier, shelf and refill, with the skill and without:**
  - **With the skill, all three are ready:** courier 10 of 10 after the fix below, shelf 8 of 8 and refill 9 of 9.
  - **Without it, the content was close on two of three:** shelf 7 of 8 and refill 9 of 9, both ready, and courier 5 of 10. The skill's clearest gain is on an API that exists: the courier baseline described the missing conventions without proposing any, and didn't flag that public tracking shows personal details.
  - **Two baselines saved `docs/api-design.md`,** where the project map doesn't find an API contract, so the gap stayed open. They were graded where they were saved, with `--document`.
- **What the runs changed:**
  - **Describing gaps instead of closing them.** The first courier run with the skill said the API has no error shape, no currency and no idempotency keys, without proposing any. The skill now proposes a convention wherever the API has none, marked proposed. The next run made every point.

- **2026-09-29, data-modelling with Codex, on courier, sprout and refill, with the skill and without:**
  - **With the skill, all three are ready:** courier 9 of 9, sprout 7 of 8 and refill 8 of 9. Without it: courier 6 of 9 and sprout 6 of 8, neither ready, and refill 9 of 9.
  - **Without the skill, courier's baseline didn't mark the recipients' details and pickup location as personal data, or ask how long they're kept,** and `check_document` refused it for not following the template. Sprout's baseline didn't say how a future change keeps what's on the device.
  - **Both runs found the planted problems that matter most:** courier's stored card numbers and security codes, the migration that dropped customers' notes, and sprout's upgrade that loses the journal.
- **What people judged in those runs:**
  - **The grader was wrong once:** it marked refill's run as not modelling order statuses as a fixed set, while quoting the fixed set, rejected prescriptions included. A person counts that run 9 of 9.
  - **Two plants with the same position** was missed with the skill and without, on sprout.

- **2026-09-29, design-system with Codex, on sprout, shelf and courier, with the skill and without:**
  - **With the skill, every point on all three:** 8 of 8 each, all ready. Without it: sprout 3 of 8, shelf 6 of 8 and courier 6 of 8, none ready.
  - **Without the skill, contrast was never worked out:** sprout's baseline found the stray grey but didn't say it's too pale, and neither sprout's nor shelf's gave contrast ratios. Courier's baseline listed no shared components with their states, and didn't pin the danger colour to one meaning.
  - **With the skill, each run found the planted problems its project has:** sprout's pale, off-token muted text and drag-only reordering; shelf's hard-coded colours, the unnamed return icon and text that ignores the reader's size; courier's status shown only by colour, the Book button a keyboard can't use, and fields without labels.

- **2026-09-29, issue-planning with Codex, on courier, shelf and sprout, with the skill and without.** Work skills are graded like documents: the runner writes out the work items a run created, and `peer-ai check` stands in for `check_document`:
  - **With the skill:** courier 8 of 8 and shelf 6 of 6 after the fix below, both ready; sprout 5 of 6. Without it: 6 of 8, 4 of 6 and 3 of 6, none ready.
  - **Without the skill,** courier's plan opened with one large "cancel pickups" item, shelf's folded the change to the other repository's API into the app's item, and sprout's planned nothing for the data kept on the device.
- **What the runs changed:**
  - **The code and the architecture weren't read before slicing.** Sprout's first plan missed that today's date is worked out in UTC, and shelf's didn't say the new screen belongs in the newer TypeScript half. The skill now reads the code each slice touches, and the architecture, first. The next runs caught both.
- **What people judged in those runs:**
  - **Sprout's last plan is a judgement call:** it has a criterion that existing plants and notes stay available, but no step for upgrading the data kept on the device. The grader didn't count it; a person could. It's counted as not ready.

- **2026-09-29, implement-ticket on split-bill, with the skill and without.** The grader reads every work item, the run's change as a diff, and what the run told the person at the end. Codex ran the first scenario; Codex's usage then ran out, so Claude Code on Sonnet ran the rest. Claude Code on Haiku graded them all:
  - **With the skill, all three scenarios are ready:** a planned item, a tip, 8 of 8; an unplanned request, uneven splits, 7 of 7; and an item waiting on another, 5 of 5. Without the skill, the tip made 5 of 8 and wasn't ready.
  - **Without the skill, the tip was built and tested well, but never finished:** the item stopped at verify with no passing verify recorded, no code review, and nothing in the README about tips.
  - **With the skill, the unplanned request got its own work item with criteria before the code,** and the tip, which the backlog also mentions, was left alone.
- **What the runs changed:**
  - **The grader couldn't see the whole picture.** At first it saw only the items a run changed, without their verify or reviews, so it marked the tip run 6 of 8 and the waiting run as writing nothing. The runner now shows every item, marked as changed or left as it was, with its last verify and reviews, and what the run told the person at the end. Graded again, the tip run made every point.
  - **An item that couldn't be built yet didn't say why it stopped.** The waiting run rightly didn't build SB-2, which needs SB-1's tip, but left SB-2's next action as it was. The grader credited that as recording where SB-2 stands; a person counts it 4 of 5. The skill now sets the next action to what the item waits for. The next run did: SB-2's next action says to build SB-1 first, because SB-2 needs the tip in the code.
- **What people judged in those runs:**
  - **A point about work the run rightly didn't do.** The grader marked the second waiting run as missing "any work done on SB-2 is covered by tests", though it wrote no code. The point now says that writing no code makes it, and graded again, the run made all 5.

- **2026-09-29, accessibility-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on courier without it:**
  - **With the skill, all three are ready:** courier 5 of 5, shelf 4 of 4 and sprout 2 of 2, each covering all 11 rules. Without it, courier found 4 of 5 and wasn't ready.
  - **The runs with the skill raised four real problems nobody planted,** now on the answer sheets: on courier, a failed booking shows the person nothing (D26), and a failed tracking lookup stays on "Loading…" for ever (D27); on shelf, the librarian's question field has no label (S25), and its button is too small to tap reliably (S26). The counts above include them. Against the sheets as they were, every run found every planted problem, the baseline included.
  - **Without the skill, courier's review missed the failed booking** and rated problems a level higher than the rules do: the Book button that isn't a button critical, and the missing labels and the colour-only status high.

- **2026-09-29, performance-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on courier without it:**
  - **With the skill, all three are ready:** courier 3 of 3, shelf 2 of 2, and sprout 3 of 3 after the fixes below, each covering all 12 rules. Without it, courier found 2 of 3 and wasn't ready: it missed the parcels looked up by customer with no index.
  - **The baseline raised one problem that isn't on the sheet,** and a person judged it fair but outside the rules: every request opens a new database connection, with no pool. It called it high; at this stage it's minor. No rule covers connection pooling yet.
  - **The first baseline stopped at a prompt** to approve installing the skills, which a baseline shouldn't be asked to do. The runner no longer tells a baseline to install them, and the second one ran through.
- **What the runs changed:**
  - **Apps never got the reliability rules.** The first sprout run saw that the service worker always serves its first copy, then marked REL-09 not applicable, because `standards_for_file` didn't return it. The tool now gives web, mobile, desktop and extension apps the reliability rules, offline ones included.
  - **A problem the code shows is a finding, whether or not its rule applies yet.** The skill already said so for rules from a later stage. It now says the same for a trait the project hasn't set, since projects often forget one. The next sprout run found the service worker problem.

- **2026-09-29, reliability-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on sprout without it:**
  - **With the skill, all three are ready:** courier 1 of 1, shelf 3 of 3 and sprout 4 of 4, each covering all 14 rules. Without it, sprout found 4 of 4 too, so the skill's gain here isn't what's found: its run took half the time and cost ($1.06 against $1.93).
  - **The baseline raised one point that isn't on the sheet,** judged fair and minor: the service worker has no fallback page when a route is neither cached nor reachable.
- **What people judged in those runs:**
  - **Sprout's data that can be cleared was named where the store opens.** The run with the skill put it at `src/db.ts`, where the database is created; the sheet only accepted `src/main.tsx`, where it's opened, and marked the run 3 of 4. Both are fair places for the fix, so the sheet now accepts either, and the run counts 4 of 4.

- **2026-09-29, compliance-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on shelf without it:**
  - **With the skill, all three are ready after the fix below:** courier 4 of 4, shelf 5 of 5 and sprout 1 of 1, each covering all 12 rules. Without it, shelf found 5 of 5 too, in twice the time ($1.65 and 8 minutes, against $1.32 and 4).
  - **One finding was wrong:** the second shelf run said the reader's saved books are kept with no retention period. They're the reader's own list on their own phone; retention duties apply to what the service keeps.
  - **The baseline raised one fair point that isn't on the sheet:** the requirements should have prompted a check on whether a data protection impact assessment is needed.
- **What the runs changed:**
  - **A public page that shows personal data wasn't checked.** The first courier run missed that public tracking shows the recipient's name and address to anyone with the link. The skill now counts a page or response that shows personal data as somewhere the data goes, and checks that it shows only what its readers need. The next run found it.
  - **Findings now point at where a service is set up,** so one fix covers every caller.
- **What people judged in those runs:**
  - **Shelf's analytics with no consent was named where it's called.** Every shelf run, with the skill and without, put it at the one place analytics is called, and the sheet only accepted the analytics module. It's the same problem, so the sheet now accepts both, and the counts above include it.

- **2026-09-29, data-migration-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on courier without it:**
  - **With the skill, all three are ready, twice:** courier 1 of 1, shelf 2 of 2 and sprout 1 of 1, each covering all 9 rules. Without it, courier found 1 of 1 too.
  - **Both shelf runs raised a real problem nobody planted:** the app has no way to make people on an unsafe version update (MOB-06), so a version that loses saved books can't be retired. It's now S27 on the answer sheet, and the counts include it.
- **What the runs changed:**
  - **The guide named the planted problems.** Its example failures were a column dropped with its replacement, a browser database version that deletes an old store, and a new storage key with no move: the three planted problems, almost word for word. That makes an eval measure the answers, not the skill. The guide now states the rule for every kind of storage instead, and the second runs, with that guide, found every problem again.

- **2026-09-29, design-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on sprout without it:**
  - **With the skill, all three are ready after the fix below:** courier 3 of 3, shelf 3 of 3 and sprout 3 of 3, each covering all 11 rules. Without it, sprout found 3 of 3 too.
  - **The runs raised real problems nobody planted,** now on the answer sheets, and the counts include them: courier's failed booking and stuck tracking page (D26 and D27, which accessibility-review found too), shelf's librarian screen writing its colour as a value (S28), and on sprout, a card radius with no token (SP15) and a plant list that shows nothing while it loads or when it's empty (SP16).
  - **Fair, minor points not added:** no shared component set in an app with three components, no notice when offline (called high, though only plant identification needs a connection), a colour token named for how it looks, and shelf's tokens having no radii, elevation or dark colours.
- **What the runs changed:**
  - **The first courier run never used the skill.** Its description said it reviews screens against the design system; courier has none, so the model stopped to ask whether to write one first. Most design rules, such as colour alone, contrast and text size, need only the code. The description now says the skill reviews against the design system when there is one, the skill says to review anyway without stopping to ask, and the prompt no longer says "against its design". The next run made every point. The authoring guide now carries both lessons.

- **2026-09-29, contract-check with Claude Code on Sonnet, on courier with the skill and without.** Courier is the only practice project with an API contract so far:
  - **With the skill, both runs are ready:** 6 of 8, then 7 of 8 after the fix below, each covering all 12 rules. Without it, 6 of 8 and not ready: it missed the parcel list with no paging, which was planted, and the web app's hand-written API types. It also took longer ($1.75 and 11 minutes, against $1.26 and 6).
  - **The runs raised five real problems nobody planted,** now on the answer sheet, and the counts include them. With the skill: the contract says anyone can ask the assistant, though the API requires sign-in (D28), and the web app's API types are written by hand (D29). Without it: a customer can pay for any parcel, since the payment never checks the parcel is theirs (D30, a security problem, now on the security-review and code-review sheets too); a payment returns a body the contract doesn't describe (D31); and the API refuses parcels over 30 kg, which the contract doesn't say (D32).
- **What the runs changed:**
  - **Limits weren't compared.** The baseline caught the undocumented 30 kg limit; the first run with the skill didn't. The guide now compares each field's limits, such as a range or a length, and a response with no body in the contract. The next run caught the limit; the undescribed payment body, which is low, was still missed.
- **What people judged in those runs:**
  - **The hand-written API types were named where one is written.** The second run with the skill put them at the tracking page's own `Tracking` type, and the sheet only accepted the shared request helper. Both are fair, so the sheet now accepts either.

- **2026-09-29, dependency-review with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on courier without it.** Its problems are partly planted (a look-alike package name, an abandoned package, a private package open to dependency confusion, a licence that doesn't fit, a version range) and partly true of the projects already: none has a lockfile, nothing checks their dependencies for vulnerabilities, and pinned versions of vite, vitest, requests and pytest have advisories published in 2025 and 2026. An eval run can't reach an advisory database, so the skill says so and checks whether anything checks automatically, rather than judging versions from memory:
  - **With the skill, all three are ready:** courier 4 of 4, shelf 5 of 5 and sprout 4 of 4, each covering all 8 rules. Without it, courier found 3 of 4 and wasn't ready.
  - **Shelf's run raised a real problem nobody planted:** an app shipped to people's phones, at the production stage, with no list of its dependencies (DEL-10). It's now S33, and the count includes it.
  - **Without the skill, the review cited the wrong rules:** a missing lockfile as DEL-02, pytest in production as a licence problem, and undeclared packages as vulnerabilities. It never named the look-alike package as one, though it noticed the package doesn't exist.
- **What the runs changed:**
  - **Findings about a whole file or the project had no line,** such as "no lockfile" at `package.json`, or "nothing checks for vulnerabilities" at `.`, so the scorer couldn't count them. Such a problem is now marked on the sheet as being with the whole file or project, with its rules, and counts as found by a finding there that cites one of them. The first counts were courier 4 of 4, shelf 3 of 4 and sprout 3 of 4.
- **What people judged in those runs:**
  - **The baseline's count is right for the wrong items.** By the rules it cited, it missed the lockfile and found the missing vulnerability check. A person reads it the other way round: it found the missing lockfile, and its nearest point to the vulnerability check was "no update tooling", at low. Either way it's 3 of 4, and not ready.

- **2026-09-29, an audit of the first twelve skills: they gave away their evals' answers.** Reading each skill against the answer sheets found text that described the planted problems: code-review named shelf's half-rebuilt layout, courier's mix of pounds and pence and a date worked out in UTC; ai-feature-review named courier's `cancel_parcel` tool; product-spec, system-design and issue-planning each carried a line added after an eval to catch one project's point. Several of the "What the runs changed" fixes above were of this kind, so those results partly measured the answers. Every such line now states the rule generally, with examples from the made-up bicycle repair service, and the authoring guide says a skill never gives away its evals' answers. Five descriptions that narrowed a skill to something it can do without, such as "use after a product spec", were widened, and three skills that could stop to ask now write down their questions and ask at hand-over. Skills rendered into `refill` by mistake, with the old text, are no longer kept in git; eval copies never used them.
  - **Each skill ran again on the project its leak matched most,** with Claude Code on Sonnet, graded by Claude Code on Haiku. By a person's reading, eleven of the twelve are ready: code-review on shelf 12 of 13, ai-feature-review on courier 6 of 6, requirements-analysis on courier 11 of 11, threat-model on courier 13 of 13, architecture on refill 9 of 10, product-spec on shelf 10 of 10, system-design on shelf 7 of 8, api-design on courier 9 of 10, data-modelling on courier 8 of 9, design-system on sprout 7 of 8, and issue-planning on sprout 6 of 6.
  - **security-review on shelf found 10 of 11 and wasn't ready.** It named the partner's catalogue text steering the librarian (S20), but inside another finding, about reserving a book without the reader confirming, and on the screen rather than where the text joins the instructions. One finding counts once. The shared report guidance now says each finding is one problem, at the place it happens.
- **What people judged in those runs:**
  - **The grader didn't count a proposal as setting a convention.** api-design on courier proposed one error shape, money in pence with its currency, and idempotency keys, and said the tracking endpoint must show status only; the grader marked all four as missing, quoting them. A person counts it 9 of 10. Its one real miss: how a field changes without breaking clients.
  - **design-system on sprout listed every component with the states it has and lacks,** and loading, empty and error with offline, which the grader marked missing. A person counts it 7 of 8; it proposed nothing, so nothing was marked proposed.

- **2026-09-29, test-strategy with Claude Code on Sonnet, on courier, shelf and sprout with the skill, and on courier without it:**
  - **With the skill, courier is ready at 8 of 9.** Without it, courier made 3 of 9 and wasn't ready: it said the web app's tests run on every change, which they don't, and never said which main journeys have no end-to-end test.
  - **Sprout is ready by a person's reading, at 7 of 8.** The grader counted 4, marking as missing the midnight edge, the journeys with no connection and the update reaching people, all of which the strategy plans. Its one real miss: making photos smaller before they're stored.
  - **Shelf isn't ready, in two runs.** The first made 8 of 10 by a person's reading but never said to run the main journeys on both iOS and Android. The skill then gained a line on running the main journeys on every platform the product ships to; the second run still didn't, dropped the penetration test that shelf's production stage calls for, and listed most gaps without the test that would close them: 2 of 10 by the grader, about 7 by a person, with two of four must-haves missed. Planning each gap's test, and every testing rule the stage switches on, is the work left for the next round of runs.
- **What the runs changed:**
  - **A point named a journey sprout doesn't have.** Sprout's strategy said, rightly, that nothing in the app records watering. The point now names adding a plant instead.

- **2026-09-29, qa-acceptance with Claude Code on Sonnet, on three items already built, and on the tip without it.** Each scenario writes a work item at verify and its code into the copy before the run: split-bill's tip, split-bill's uneven splits, and courier's moving a pickup. Behind tests that all pass, each hides what a tester should catch: a criterion the code doesn't meet, a refusal the criteria list that the code allows, a test whose values can't tell right from wrong, a criterion with no test, and something built that nobody asked for:
  - **With the skill, all three are ready:** 5 of 5 each, covering all 9 rules. Without it, the tip found 4 of 5 and wasn't ready: it missed that the rounding test uses a tip that needs no rounding, so it passes whatever the rounding does.
  - **An unmet criterion was reported at its rule's severity,** medium for the testing rules, and found one level away from the sheets' high. A person then approved a rule of its own: REQ-05, a feature ships only when every acceptance criterion holds, at high. qa-acceptance now reports an unmet criterion under it, and the sheets mark every unmet criterion high: the confusing error for nobody to pay, and the server's date instead of the UK's, joined the others.
- **What the runs changed:**
  - **The runner sets up review scenarios too:** an answer sheet's `setup` files are written into the copy and committed before the run, as for documents, and planted problems can be in them. The shared practice projects stay as they are.
  - **Before any run, the checking guide gave away four of its own answers,** such as a rounding test whose value needs no rounding, and whose clock the code uses. Each was rewritten as the general rule.

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
| 2026-09-29 | courier | accessibility-review | Claude Code | sonnet | used | 5 of 5 | 11 of 11 | 0 | Ready | $0.91 |
| 2026-09-29 | shelf | accessibility-review | Claude Code | sonnet | used | 4 of 4 | 11 of 11 | 0 | Ready | $1.64 |
| 2026-09-29 | sprout | accessibility-review | Claude Code | sonnet | used | 2 of 2 | 11 of 11 | 0 | Ready | $0.97 |
| 2026-09-29 | courier | accessibility-review | Claude Code | sonnet | without | 4 of 5 | 11 of 11 | 0 | Not ready | $0.94 |
| 2026-09-29 | courier | performance-review | Claude Code | sonnet | used | 3 of 3 | 12 of 12 | 0 | Ready | $1.02 |
| 2026-09-29 | shelf | performance-review | Claude Code | sonnet | used | 2 of 2 | 12 of 12 | 0 | Ready | $1.43 |
| 2026-09-29 | sprout | performance-review | Claude Code | sonnet | used | 2 of 3 | 12 of 12 | 0 | Not ready | $1.15 |
| 2026-09-29 | courier | performance-review | Claude Code | sonnet | without | 2 of 3 | 12 of 12 | 1 | Not ready | $1.27 |
| 2026-09-29 | sprout | performance-review | Claude Code | sonnet | used | 3 of 3 | 12 of 12 | 0 | Ready | $0.92 |
| 2026-09-29 | courier | reliability-review | Claude Code | sonnet | used | 1 of 1 | 14 of 14 | 0 | Ready | $1.16 |
| 2026-09-29 | shelf | reliability-review | Claude Code | sonnet | used | 3 of 3 | 14 of 14 | 0 | Ready | $1.69 |
| 2026-09-29 | sprout | reliability-review | Claude Code | sonnet | used | 4 of 4 | 14 of 14 | 0 | Ready | $1.06 |
| 2026-09-29 | sprout | reliability-review | Claude Code | sonnet | without | 4 of 4 | 14 of 14 | 1 | Ready | $1.93 |
| 2026-09-29 | courier | compliance-review | Claude Code | sonnet | used | 3 of 4 | 12 of 12 | 0 | Not ready | $1.23 |
| 2026-09-29 | shelf | compliance-review | Claude Code | sonnet | used | 5 of 5 | 12 of 12 | 0 | Ready | $1.78 |
| 2026-09-29 | sprout | compliance-review | Claude Code | sonnet | used | 1 of 1 | 12 of 12 | 0 | Ready | $0.96 |
| 2026-09-29 | shelf | compliance-review | Claude Code | sonnet | without | 5 of 5 | 12 of 12 | 1 | Ready | $1.65 |
| 2026-09-29 | courier | compliance-review | Claude Code | sonnet | used | 4 of 4 | 12 of 12 | 0 | Ready | $1.27 |
| 2026-09-29 | shelf | compliance-review | Claude Code | sonnet | used | 5 of 5 | 12 of 12 | 1 | Ready | $1.32 |
| 2026-09-29 | courier | data-migration-review | Claude Code | sonnet | used | 1 of 1 | 9 of 9 | 0 | Ready | $0.81 |
| 2026-09-29 | shelf | data-migration-review | Claude Code | sonnet | used | 2 of 2 | 9 of 9 | 0 | Ready | $1.02 |
| 2026-09-29 | sprout | data-migration-review | Claude Code | sonnet | used | 1 of 1 | 9 of 9 | 0 | Ready | $0.88 |
| 2026-09-29 | courier | data-migration-review | Claude Code | sonnet | without | 1 of 1 | 9 of 9 | 0 | Ready | $0.90 |
| 2026-09-29 | courier | data-migration-review | Claude Code | sonnet | used | 1 of 1 | 9 of 9 | 0 | Ready | $0.68 |
| 2026-09-29 | shelf | data-migration-review | Claude Code | sonnet | used | 2 of 2 | 9 of 9 | 0 | Ready | $0.84 |
| 2026-09-29 | sprout | data-migration-review | Claude Code | sonnet | used | 1 of 1 | 9 of 9 | 0 | Ready | $0.86 |
| 2026-09-29 | courier | design-review | Claude Code | sonnet | installed, not used | 0 of 3 | 0 of 11 | 0 | Not ready | $0.18 |
| 2026-09-29 | shelf | design-review | Claude Code | sonnet | used | 3 of 3 | 11 of 11 | 1 | Ready | $1.71 |
| 2026-09-29 | sprout | design-review | Claude Code | sonnet | used | 3 of 3 | 11 of 11 | 2 | Ready | $0.95 |
| 2026-09-29 | sprout | design-review | Claude Code | sonnet | without | 3 of 3 | 11 of 11 | 2 | Ready | $1.08 |
| 2026-09-29 | courier | design-review | Claude Code | sonnet | used | 3 of 3 | 11 of 11 | 0 | Ready | $0.90 |
| 2026-09-29 | courier | contract-check | Claude Code | sonnet | used | 6 of 8 | 12 of 12 | 0 | Ready | $1.26 |
| 2026-09-29 | courier | contract-check | Claude Code | sonnet | without | 6 of 8 | 12 of 12 | 0 | Not ready | $1.75 |
| 2026-09-29 | courier | contract-check | Claude Code | sonnet | used | 7 of 8 | 12 of 12 | 0 | Ready | $1.13 |
| 2026-09-29 | courier | dependency-review | Claude Code | sonnet | used | 4 of 4 | 8 of 8 | 0 | Ready | $1.22 |
| 2026-09-29 | shelf | dependency-review | Claude Code | sonnet | used | 5 of 5 | 8 of 8 | 0 | Ready | $1.44 |
| 2026-09-29 | sprout | dependency-review | Claude Code | sonnet | used | 4 of 4 | 8 of 8 | 0 | Ready | $1.01 |
| 2026-09-29 | courier | dependency-review | Claude Code | sonnet | without | 3 of 4 | 8 of 8 | 4 | Not ready | $1.26 |
| 2026-09-29 | shelf | security-review | Claude Code | sonnet | used | 10 of 11 | 47 of 47 | 5 | Not ready | $1.76 |
| 2026-09-29 | shelf | code-review | Claude Code | sonnet | used | 12 of 13 | 67 of 67 | 4 | Ready | $1.93 |
| 2026-09-29 | courier | ai-feature-review | Claude Code | sonnet | used | 6 of 6 | 14 of 14 | 1 | Ready | $1.11 |
| 2026-09-29 | split-bill-qa-tip | qa-acceptance | Claude Code | sonnet | used | 5 of 5 | 9 of 9 | 1 | Ready | $0.87 |
| 2026-09-29 | split-bill-qa-uneven | qa-acceptance | Claude Code | sonnet | used | 5 of 5 | 9 of 9 | 0 | Ready | $1.12 |
| 2026-09-29 | courier-qa-move | qa-acceptance | Claude Code | sonnet | used | 5 of 5 | 9 of 9 | 0 | Ready | $1.01 |
| 2026-09-29 | split-bill-qa-tip | qa-acceptance | Claude Code | sonnet | without | 4 of 5 | 9 of 9 | 0 | Not ready | $1.20 |

## Document results

Newest last. **Points** is how many of the scenario's points the grader found in the document, and **Must-haves** how many of those it must make. **Check** is whether `check_document` accepted it, or for a work skill, whether `peer-ai check` accepted its work items.

| Date | Project | Document | Tool | Model | Skill | Points | Must-haves | Check | Result | Grader | Cost |
|------|---------|----------|------|-------|-------|--------|------------|-------|--------|--------|------|
| 2026-09-29 | refill | requirements-analysis | Codex | default | used | 13 of 13 | 6 of 6 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | requirements-analysis | Codex | default | used | 10 of 11 | 5 of 5 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | requirements-analysis | Codex | default | used | 10 of 11 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | refill | requirements-analysis | Codex | default | without | 10 of 13 | 6 of 6 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | requirements-analysis | Codex | default | without | 7 of 11 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | requirements-analysis | Codex | default | without | 8 of 11 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | requirements-analysis | Codex | default | used | 9 of 11 | 3 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | requirements-analysis | Codex | default | used | 11 of 11 | 5 of 5 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | requirements-analysis | Codex | default | used | No document | – | – | Not ready | Codex | – |
| 2026-09-29 | courier | requirements-analysis | Codex | default | used | 11 of 11 | 5 of 5 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | threat-model | Codex | default | used | 11 of 13 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | threat-model | Codex | default | used | 10 of 11 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | threat-model | Codex | default | used | 9 of 10 | 3 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | threat-model | Codex | default | without | 10 of 13 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | threat-model | Codex | default | without | 7 of 11 | 2 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | threat-model | Codex | default | without | 9 of 10 | 3 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | threat-model | Codex | default | used | 13 of 13 | 5 of 5 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | threat-model | Codex | default | used | 9 of 11 | 4 of 5 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | threat-model | Codex | default | used | 10 of 10 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | architecture | Codex | default | used | 9 of 10 | 3 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | architecture | Codex | default | used | 8 of 9 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | refill | architecture | Codex | default | used | 9 of 10 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | architecture | Codex | default | without | 5 of 10 | 2 of 4 | Refused | Not ready | Codex | – |
| 2026-09-29 | shelf | architecture | Codex | default | without | 8 of 9 | 3 of 3 | Refused | Not ready | Codex | – |
| 2026-09-29 | refill | architecture | Codex | default | without | 7 of 10 | 2 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | architecture | Codex | default | used | 10 of 10 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | product-spec | Codex | default | used | 9 of 11 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | product-spec | Codex | default | used | 9 of 10 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | product-spec | Codex | default | used | 8 of 10 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | product-spec | Codex | default | without | 8 of 11 | 4 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | product-spec | Codex | default | without | No document | – | – | Not ready | Codex | – |
| 2026-09-29 | sprout | product-spec | Codex | default | without | 7 of 10 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | product-spec | Codex | default | used | 10 of 11 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | product-spec | Codex | default | used | 10 of 10 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | product-spec | Codex | default | used | 9 of 10 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | product-spec | Codex | default | used | 8 of 10 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | system-design | Codex | default | used | 9 of 10 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | system-design | Codex | default | used | 7 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | system-design | Codex | default | used | 7 of 8 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | system-design | Codex | default | without | 7 of 10 | 4 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | system-design | Codex | default | without | 5 of 8 | 1 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | system-design | Codex | default | without | 7 of 8 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | system-design | Codex | default | used | 10 of 10 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | system-design | Codex | default | used | 7 of 8 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | system-design | Codex | default | used | 7 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | api-design | Codex | default | used | 7 of 10 | 3 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | api-design | Codex | default | used | 8 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | refill | api-design | Codex | default | used | 9 of 9 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | api-design | Codex | default | without | 5 of 10 | 3 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | api-design | Codex | default | without | 7 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | refill | api-design | Codex | default | without | 9 of 9 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | api-design | Codex | default | used | 10 of 10 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | data-modelling | Codex | default | used | 9 of 9 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | data-modelling | Codex | default | used | 7 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | refill | data-modelling | Codex | default | used | 8 of 9 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | data-modelling | Codex | default | without | 6 of 9 | 4 of 4 | Refused | Not ready | Codex | – |
| 2026-09-29 | sprout | data-modelling | Codex | default | without | 6 of 8 | 3 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | refill | data-modelling | Codex | default | without | 9 of 9 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | design-system | Codex | default | used | 8 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | design-system | Codex | default | used | 8 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | courier | design-system | Codex | default | used | 8 of 8 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | design-system | Codex | default | without | 3 of 8 | 1 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | design-system | Codex | default | without | 6 of 8 | 3 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | design-system | Codex | default | without | 6 of 8 | 3 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | issue-planning | Codex | default | used | 8 of 8 | 4 of 4 | Accepted | Ready | Codex | – |
| 2026-09-29 | shelf | issue-planning | Codex | default | used | 5 of 6 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | issue-planning | Codex | default | used | 4 of 6 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | courier | issue-planning | Codex | default | without | 6 of 8 | 3 of 4 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | issue-planning | Codex | default | without | 4 of 6 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | sprout | issue-planning | Codex | default | without | 3 of 6 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | shelf | issue-planning | Codex | default | used | 6 of 6 | 3 of 3 | Accepted | Ready | Codex | – |
| 2026-09-29 | sprout | issue-planning | Codex | default | used | 5 of 6 | 2 of 3 | Accepted | Not ready | Codex | – |
| 2026-09-29 | split-bill | implement-ticket | Codex | default | used | 8 of 8 | 4 of 4 | Accepted | Ready | Claude Code, haiku | – |
| 2026-09-29 | split-bill-uneven | implement-ticket | Claude Code | sonnet | used | 7 of 7 | 3 of 3 | Accepted | Ready | Claude Code, haiku | $1.58 |
| 2026-09-29 | split-bill-waiting | implement-ticket | Claude Code | sonnet | used | 5 of 5 | 3 of 3 | Accepted | Ready | Claude Code, haiku | $0.20 |
| 2026-09-29 | split-bill | implement-ticket | Claude Code | sonnet | without | 5 of 8 | 3 of 4 | Accepted | Not ready | Claude Code, haiku | $0.43 |
| 2026-09-29 | split-bill-waiting | implement-ticket | Claude Code | sonnet | used | 5 of 5 | 3 of 3 | Accepted | Ready | Claude Code, haiku | $0.24 |
| 2026-09-29 | courier | requirements-analysis | Claude Code | sonnet | used | 11 of 11 | 5 of 5 | Accepted | Ready | Claude Code, haiku | $0.87 |
| 2026-09-29 | courier | threat-model | Claude Code | sonnet | used | 13 of 13 | 5 of 5 | Accepted | Ready | Claude Code, haiku | $1.51 |
| 2026-09-29 | refill | architecture | Claude Code | sonnet | used | 9 of 10 | 4 of 4 | Accepted | Ready | Claude Code, haiku | $0.75 |
| 2026-09-29 | shelf | product-spec | Claude Code | sonnet | used | 10 of 10 | 3 of 3 | Accepted | Ready | Claude Code, haiku | $0.75 |
| 2026-09-29 | shelf | system-design | Claude Code | sonnet | used | 7 of 8 | 3 of 3 | Accepted | Ready | Claude Code, haiku | $1.09 |
| 2026-09-29 | courier | api-design | Claude Code | sonnet | used | 5 of 10 | 3 of 3 | Accepted | Not ready | Claude Code, haiku | $0.80 |
| 2026-09-29 | courier | data-modelling | Claude Code | sonnet | used | 8 of 9 | 4 of 4 | Accepted | Ready | Claude Code, haiku | $0.54 |
| 2026-09-29 | sprout | design-system | Claude Code | sonnet | used | 5 of 8 | 3 of 3 | Accepted | Not ready | Claude Code, haiku | $0.71 |
| 2026-09-29 | sprout | issue-planning | Claude Code | sonnet | used | 6 of 6 | 3 of 3 | Accepted | Ready | Claude Code, haiku | $0.47 |
| 2026-09-29 | courier | test-strategy | Claude Code | sonnet | used | 8 of 9 | 4 of 4 | Accepted | Ready | Claude Code, haiku | $0.92 |
| 2026-09-29 | shelf | test-strategy | Claude Code | sonnet | used | 6 of 10 | 3 of 4 | Accepted | Not ready | Claude Code, haiku | $1.03 |
| 2026-09-29 | sprout | test-strategy | Claude Code | sonnet | used | 4 of 8 | 1 of 3 | Accepted | Not ready | Claude Code, haiku | $1.25 |
| 2026-09-29 | courier | test-strategy | Claude Code | sonnet | without | 3 of 9 | 2 of 4 | Accepted | Not ready | Claude Code, haiku | $0.91 |
| 2026-09-29 | shelf | test-strategy | Claude Code | sonnet | used | 2 of 10 | 1 of 4 | Accepted | Not ready | Claude Code, haiku | $1.20 |
