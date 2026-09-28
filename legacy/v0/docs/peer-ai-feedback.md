# Peer AI — Feedback from a Real Run

Maintainer's fix list for the upstream Peer AI playbook, collected while running it end to end on this project with Claude Code.

| Field | Value |
|-------|-------|
| **Playbook version observed** | commit `33051c5` ("fix: full agent-agnostic audit pass …") |
| **Phases run** | 00 Setup, 01 Understand, 02 Architect, 03 System Spec, 04 API Contract |
| **Tool** | Claude Code (desktop app), single model for the whole run |
| **Date** | 2026-09-07 |

Items are grouped by the file they concern. Each has the observed problem, where it is, and a suggested fix. Severity is a judgement call: **fix** means a user will hit it, **polish** means cosmetic or consistency.

**Status (2026-09-07):** all twenty items are applied in this repo.

**Second run (2026-09-11):** items 21-28 come from a React Native project and items 29-32 from the first project's build phase. **All twelve are now applied in this repo.**

Items 21-25, 27, 29 and 30 were one defect in eight places - the playbook described itself as portable and then prescribed a web stack with a backend and no existing design. Each is now conditional on what the project actually is, and every default that named a bundler, a toggle, a styling library or a test runner has been replaced with a pointer to the decision the architecture phase already made. Item 26 made the phase enum checked rather than merely published. Item 31 gave the PDF offer a field to remember itself by. Item 32 gave the workflow driver a **Merge policy** setting, so it no longer tells an agent to merge locally while the shared rules require a reviewed pull request. Item 28's scripts do not live in this repo; its transferable half is the warning in `CONTRIBUTING.md` that a vendored copy's post-pull script must fail loudly. Items 21-27 are live defects at `13b73f9`; item 28 concerns the per-project customisation scripts, which do not live in this repo. Item 5 collapsed setup into one question round; item 18 made every model-switch gate conditional on a **Model selector** setting the workflow driver now carries; item 20 moved the PDF offer into `shared/rules/shared.md` with phases pointing there.

---

## `README.md`

1. **Nested `.git` is only handled in the README.** *(fix)*
   **Where:** Quick start step 1 says `rm -rf peer-ai/.git`.
   **Problem:** Nothing downstream checks that this happened. If a user skips it, `git add` records `peer-ai/` as an empty gitlink and the playbook never lands in the project repo. See the matching item under `shared/00-setup.md`.
   **Fix:** Keep the README instruction and add the check to setup step 1.

2. **"After setup" tree shows `docs/`, which setup never creates.** *(polish)*
   **Where:** Quick start step 3 tree.
   **Fix:** Either create `docs/` in setup (a natural home for the stakeholder brief) or label it "created by phase 1".

---

## `shared/00-setup.md`

3. **Step 1 does not check for a nested `peer-ai/.git`.** *(fix)*
   **Where:** "1. Confirm the workflow location".
   **Fix:** Add: "If `peer-ai/.git` exists, delete it so the playbook is committed as plain files."

4. **The workflow driver is copied for Cursor only.** *(fix)*
   **Where:** Step 2, options A–D. Option A lists `workflow-driver.md` explicitly. Options B (Claude Code) and C (Codex) say only "summarizing the standards + pointing to `peer-ai/`".
   **Problem:** `shared/rules/workflow-driver.md` says its content is "appended to `CLAUDE.md` for Claude Code, or into `AGENTS.md` for Codex/others", so the two files disagree. A Claude Code or Codex user following setup literally ends up without the ambient driver, which is the README's headline feature.
   **Fix:** In options B, C, and D, say explicitly: append the contents of `shared/rules/workflow-driver.md` (with placeholders filled) to the config file.

5. **Seven "wait for the user" gates for a scaffolding phase.** *(polish)*
   **Where:** Model switch, step 1, step 2 (twice), step 3, step 4, step 5, journal.
   **Problem:** The phase describes itself as "mostly file scaffolding", yet it has more gates than any spec phase. The first gate asks the user to switch models, which the agent cannot verify.
   **Fix:** Collapse steps 1–3 into one question round (tool, project name, tracker, starting point). Make the model-switch gate a one-time notice, or conditional on tools that have a model selector.

---

## `shared/rules/workflow-driver.md`

6. **Placeholders are described but not marked.** *(fix)*
   **Where:** Intro paragraph: "Customize the placeholders for your project: verify command, issue tracker name, design guide path, and branch naming conventions."
   **Problem:** The body has no visible markers. It hardcodes `git push -u origin`, `npm run verify`, "move ticket Backlog → In Progress", "post a project-level update", and `docs/mockup/`. A first-time user cannot tell which lines are examples.
   **Fix:** Wrap each customizable value in `[PLACEHOLDER: …]` like the templates do, and add a "no remote" and "no issue tracker" variant for solo projects, since every push and tracker step is mandatory as written.

7. **Destination for Claude Code and Codex contradicts `00-setup.md`.** *(fix)*
   See item 4. Whichever file is right, make the other match.

---

## `shared/workflow-state.md` and `templates/.peer-ai-state.json`

8. **`ticketsCancelled` is in the template but not in the field reference.** *(polish)*
   **Where:** Template has `"ticketsCancelled": []`; the "Field reference" table in `workflow-state.md` does not list it.
   **Fix:** Add the row.

9. **No canonical list of `currentPhase` values.** *(fix)*
   **Where:** Field reference says "Active phase name (`understand`, `build`, `review`, `test`, `document`, etc.)".
   **Problem:** The spec phases have no defined names. This run had to invent `architect`, `spec-system`, `spec-api-contract`, and `rules-shared`. Two sessions, or two tools, could name the same phase differently and the driver has nothing to match against.
   **Fix:** Publish an enum, one value per phase file, in `workflow-state.md` and mirror it as a comment in the template. Suggested: `setup`, `understand`, `architect`, `spec-system`, `spec-api-contract`, `rules-shared`, `spec-pages` / `spec-endpoints`, `rules-track`, `issues`, `build`, `review`, `test`, `document`, `pr-automation`, `done`.

---

## `shared/01-understand.md` and `shared/templates/requirements-summary-template.md`

10. **Dependency table columns differ between the phase and its template.** *(polish)*
    **Where:** Step 4 asks for **Dependency | Owner | What's needed | Status**. The template's "Stakeholders & Dependencies" table has **Name | Role | Dependency | Status**.
    **Fix:** Pick one. The phase's columns answer the question the step asks ("things you'll need from other people").

11. **Step 1 assumes the inputs are not yet in the chat.** *(polish)*
    **Where:** "Before we start, share everything you've got…" with a hard wait.
    **Problem:** When the user has already pasted the brief (the common case when invoking the phase), the gate asks for what it already has.
    **Fix:** "If the user has already shared the assignment, confirm it is complete and move on."

---

## `shared/02-architect.md` and `shared/templates/architecture-decision-record.md`

12. **Two ADR formats, no guidance on which to use.** *(polish)*
    **Where:** Step 8 asks for mini ADRs (Decision, Context, Consequences, 2–4 sentences each) inline in `docs/02-architecture.md`. The templates folder ships a one-file-per-decision ADR template with Status, Deciders, Alternatives, Related ADRs. Neither file mentions the other.
    **Fix:** In step 8, say: "Use the mini format inline; promote a decision to its own file from `templates/architecture-decision-record.md` when it needs alternatives or a status lifecycle."

---

## `shared/03-spec-system.md` and `shared/templates/pm-spec-template.md`

13. **Roles table columns differ between the phase and its template.** *(polish)*
    **Where:** Step 3 asks for **Role | Description | Can see / do | Cannot see / do**. The template has **Role | Description | Access Level | Key Actions**.
    **Fix:** Align them. "Cannot see / do" is the more useful column for permission review; the template should adopt it.

---

## `shared/04-spec-api-contract.md` and `shared/templates/api-contract-template.md`

14. **Domain leftovers from a specific project.** *(fix)*
    **Where:** Template example endpoints came from a previous project's domain (device telemetry), with that project's own field names, several of them snake_case. The template header comment and the phase's step 8 "Suggested endpoint priority order" hardcode Auth → Customers → Support cases → Notes → Remote actions. Step 2 examples mention IoT and Shopify.
    **Problem:** The playbook is presented as generic. These read as one company's leftovers and, worse, the examples use snake_case keys while the phase's step 3 recommends camelCase, so the template contradicts the conventions section on the same page.
    **Fix:** Replace the examples with a neutral domain (a to-do list or this project's expenses would do), make the priority order a template with placeholders, and use camelCase in every example.

15. **Step 4 assumes authentication exists.** *(fix)*
    **Where:** "Define the authentication flow" walks through login, refresh, and redirect with a hard wait.
    **Problem:** Local-first, single-device, or internal-tool v1s often have no auth. The step has no "none in this version, reserve for later" branch.
    **Fix:** Start the step with "If this version has no auth, record that and what is reserved for later, then skip to step 5."

16. **Template envelope and phase envelope differ slightly.** *(polish)*
    **Where:** Phase step 3 success envelope is `{ success, data, message, timestamp }`. The template's first example endpoint adds top-level `pagination` and `count` beside `data`.
    **Fix:** Show pagination inside `data` or state explicitly that it sits beside it. Either is fine; the two files should agree.

---

## `shared/design-data-contract.md`

17. **Refers to a `FINDINGS.md` that no phase creates.** *(fix)*
    **Where:** "During build, record discrepancies in your project's findings log (e.g. `FINDINGS.md`)". A search of the playbook finds no other mention.
    **Fix:** Either have `frontend/03-build.md` and `backend/03-build.md` create and reference the findings log, or point this sentence at `CONTEXT.md` "Open Questions" or the issue plan instead.

---

## Cross-cutting: every phase file

18. **Model-switch gates are heavy for single-model tools.** *(polish)*
    **Where:** Every phase opens with "switch to your [tier] model … wait for the user to confirm", and every doc-producing phase closes with a PDF offer that asks for a switch to the fastest model and back. `shared/rules/shared.md` makes the wait mandatory ("Do NOT proceed until the user confirms the switch").
    **Problem:** Across the five phases run here that is eleven model prompts. In Claude Code, Codex, and most chat tools the model is fixed for the session or chosen outside the conversation, so the gate can only ever be answered "yes".
    **Fix:** Ask once in setup which tool is in use and whether it has a per-phase model selector. If not, phases print the recommendation as a one-line note without a gate.

19. **Curly quotes in the journal section of 16 phase files.** *(polish)*
    **Where:** `“Before we move on, I can capture…”` and `**Wait for the user’s input.**` in `shared/01`–`07`, `frontend/01`, `03`–`05`, `backend/01`–`05`. Everything else in the repo uses straight quotes.
    **Fix:** Normalise to straight quotes. A `grep -rl "’\|“\|”" peer-ai` finds them.

20. **The "PDF-ready export" offer repeats verbatim in every phase.** *(polish)*
    **Where:** Understand, Architect, System Spec, API Contract, and the shared rules all carry the same three-sentence offer plus a model-switch gate.
    **Fix:** Keep it in `shared/rules/shared.md` only, and have phases say "offer the PDF export per the shared rules" in one line.

---

---

# Second run — a React Native rebuild, 11 September 2026

A second end-to-end run, on a very different project: an existing production
codebase whose **mobile apps are being rebuilt in React Native**. The first run was a small web app, and that
difference is what these items are about.

**Every one of items 21–25 is the same defect wearing different clothes: the
playbook says it is stack-agnostic, and then prescribes a web stack.** Item 14
found this in the API contract's example domain and fixed it there. It is not
fixed in the frontend track, where it does more damage — an agent following
`frontend/03-build.md` literally will run the wrong scaffolder and produce an
app the project cannot use.

| Field | Value |
|-------|-------|
| **Playbook version observed** | commit `13b73f9` (all twenty items above applied) |
| **Phases run** | 01 Understand, 02 Architect, 03 System Spec, 04 API Contract, 05 Shared Rules, frontend 01 Page Specs, 02 Rules, 03 Build |
| **Tool** | Claude Code (desktop app), two pinned models |
| **Project shape** | Existing backend, React Native apps on Expo, pnpm monorepo |

---

## `frontend/03-build.md`

21. **Step 1 prescribes one bundler.** *(fix)*
    **Where:** "If **new**: scaffold **Vite + React + TypeScript**".
    **Problem:** This is the only phase that names a specific stack as an
    instruction rather than an example, and it contradicts the architecture
    phase that has just run. Phase 02 exists to *decide* the stack and record
    it in decision records; step 1 then ignores that output. A React Native,
    Expo, Next.js, Nuxt or SvelteKit project following this literally scaffolds
    the wrong thing on top of a correct architecture document.
    **Fix:** "Scaffold the stack `docs/02-architecture.md` decided — read its
    decision records before running any generator." Name no default.

22. **Step 4 names a Vite-specific environment variable.** *(fix)*
    **Where:** "Wire **`VITE_USE_MOCK_DATA`** (or the project's agreed toggle)".
    **Problem:** The parenthetical hedge is too weak against a bolded literal;
    the rules phase already settles this variable's name, so the build phase
    should defer rather than lead. On Expo the prefix is mandatory and
    different (`EXPO_PUBLIC_`), so the named example is not merely unhelpful,
    it is invalid.
    **Fix:** "Wire the project's agreed mock toggle — the environment variable
    the rules phase settled, whatever its name."

23. **Step 3 assumes a desktop browser.** *(polish)*
    **Where:** "**sidebar** (or nav)" and "Please run the **dev server** and
    click through the shell".
    **Problem:** A phone app has no sidebar and is not exercised through a dev
    server in a browser. The routing examples list React Router, Vue Router and
    Next.js App Router, omitting Expo Router — the default for the largest
    non-web React target.
    **Fix:** "navigation (a sidebar on desktop, tabs or a stack on mobile —
    whichever the page specs show)", "run the app", and add Expo Router.

---

## `frontend/02-rules.md`

24. **The styling question offers only web answers.** *(fix)*
    **Where:** Step 5: "Ask which stack they prefer: **Tailwind**, **CSS
    Modules**, **styled-components**, or a mix."
    **Problem:** None of the three exist on React Native, where the choice is
    between StyleSheet, a theme object, or a styling library. The step asks a
    question with no correct answer and then locks the rules to it.
    **Fix:** Ask the question the platform poses, and give the mobile options
    alongside the web ones.

---

## `shared/09-pr-automation.md`

25. **The sample CI workflow assumes there is no CI yet.** *(fix)*
    **Where:** The `npm ci` / `npm run lint` / `npm run typecheck` /
    `npm run build` workflow block.
    **Problem:** It is offered unconditionally. On a project that already has a
    pipeline, following it produces a **second, shallower** workflow running
    beside the real one — and because branch protection keys off a named check,
    two pipelines with different opinions about "passing" is worse than one.
    There is no "the project already has CI" branch.
    **Fix:** Open the section with: "If the project already has a pipeline,
    extend it. Add a second workflow only when none exists." Keep the sample
    for the genuinely-new case.

---

## `frontend/05-test.md`

27. **Step 2 installs tooling an accepted decision record has rejected.** *(fix)*
    **Where:** "If anything is missing, add **Vitest** config, **Playwright**
    config".
    **Problem:** The same defect as item 21, and the sharpest instance of it,
    because here the playbook actively contradicts its own earlier output. On
    this project an accepted decision record rejects Vitest by name — React Native Testing Library
    does not support it — yet the test phase instructs the agent to install it.
    An agent that trusts the phase file over the architecture document
    installs a test runner that cannot run the tests.
    **Fix:** "Add the unit and end-to-end tooling the architecture chose — read
    `docs/02-architecture.md` before installing anything, because a decision
    record may already have rejected the obvious default." Step 1's question
    should likewise name candidates from the project's platform, not assume web.

---

## The customisation scripts *(local to that project, but the lesson is general)*

28. **Both helper scripts hardcoded one developer's absolute path.** *(fix)*
    **Where:** `apply-phase-config.ps1` and `strip-model-switching.ps1`, near
    the top: `$root = "C:\path\to\standalone\peer-ai"`.
    **Problem:** That path is the *standalone clone*, not the vendored copy the
    script ships inside. Running either from the project therefore edited a
    different repository and silently left the project's own phase files
    untouched - and on any other machine it resolves to nothing at all. The
    failure is invisible, because the script prints its usual summary against
    whatever it found. This is exactly the hazard the project's own rules file
    gave as the reason peer-ai was vendored in the first place - it used to be
    referenced from a folder on one developer's machine, so the path resolved
    to nothing for anyone else - reproduced inside the vendored copy.
    **Fix:** `$root = $PSScriptRoot`. A script that customises the playbook
    should operate on the playbook it ships with, always.
    **Scope — checked, not assumed:** this was **that project's copy only**. The
    other project that uses these scripts already locates itself with
    `Split-Path -Parent $MyInvocation.MyCommand.Path`, and the scripts do not
    exist in the peer-ai repository at all — they are a per-project
    customisation layer. This copy was written first and kept the literal path
    the later one had already replaced. Nothing
    to fix in those projects; recorded here so the pattern is on the list, since
    the next project to copy the scripts will copy them from somewhere.

---

## Still true from the first run

26. **Item 9's enum landed, but nothing enforces it.** *(polish)*
    The `currentPhase` table is published and is a real improvement. This run
    still found a state file carrying `frontend-build` and `review-complete`,
    neither in the enum — invented before the table existed and never
    reconciled, because no phase re-reads it. A one-line check at the top of
    each phase ("if `currentPhase` is not in the enum, say so and correct it")
    would close the loop the table opened.

---

---

# Third source — the first project's build phase

Items 1-20 came from the first project's *specification* phases. These four came later,
from its **build**, and were logged in the project rather than here. They are
folded in now. Two of them overlap with the React Native items above from a different
angle, noted per item.

## `frontend/03-build.md`

29. **Step 4 is unconditional, but the playbook supports projects with no API.** *(fix)*
    **Where:** step 4 "Mock data layer". Also `frontend/rules/frontend.md`,
    "API integration" and the whole "Simulation mode" section.
    **Problem:** step 4 says *"For **every endpoint** described in
    `docs/04-api-contract.md`, add **mock functions** ... so services switch
    between mock and real."* But `shared/04-spec-api-contract.md` explicitly
    allows the contract to record *"an explicit note that this version has
    none"*, and the README describes that case. A local-first app has no
    endpoints to mock and no real API to swap to. An agent following the file
    literally invents a `services/` layer and a mock toggle **the architecture
    forbids**, then spends the rest of the build reconciling two data seams.
    **Fix:** make step 4 conditional. *"If the contract defines HTTP endpoints,
    build the mock layer below. If it records that this version has no API, the
    data seam is the repository or storage interface named in the architecture
    — there is nothing to mock, and the local implementation is the real one.
    Skip to step 5."* Add the same conditional to the two spots in
    `frontend/rules/frontend.md`.
    *(Related to item 22, which reaches the same step from the opposite case —
    a project whose toggle exists but is not Vite's. Both want step 4 to stop
    assuming one shape of data access.)*

30. **Step 2 has no branch for "the design already exists".** *(fix)*
    **Where:** step 2 "Design mockups (before writing code)".
    **Problem:** the options are A-D (*create* mockups in Figma / Penpot /
    Paper / another tool) and E (*"Skip - build directly in code ... Fastest
    path"*). There is no option for a project whose design system and screen
    designs **already exist and are authoritative**. Such a project must answer
    E, whose wording tells the agent the opposite of the truth: it implies no
    design exists and invites improvisation, when the design is fixed and must
    be implemented exactly. Step 9's design-quality pass then has nothing to
    check against.
    **Fix:** add **option F - "The design already exists"**: ask where it lives
    (a tokens file, a folder of exports, a link), read it before any UI code,
    treat it as authoritative on layout, spacing, type and colour, and point
    step 9's design-quality pass at it rather than at generic heuristics.
    *(Confirmed independently on the React Native project, which has complete design canvases and
    a rule forbidding invented layouts, and had to answer E for the same wrong
    reason. Two of three projects hit this; option F should be the default
    branch, not an afterthought.)*

## `shared/rules/shared.md`

31. **"Offer once" for the PDF export has nothing to remember it by.** *(polish)*
    **Where:** "PDF-ready doc export": *"When any markdown file is saved to
    `docs/`, offer once."* Reinforced by `shared/rules/docs-pdf-export.md`.
    **Problem:** "once" has no scope and no storage. `.peer-ai-state.json` has
    no field recording that the offer was made, so across sessions an agent
    either re-offers on every document — the workflow produces a dozen — or
    drops it silently after the first. Both are wrong and neither is
    detectable.
    **Fix:** either add a `pdfExportOffered` boolean to the state schema in
    `templates/.peer-ai-state.json` and have the rule check it, or reword to a
    scope that needs no memory: *"offer once per phase, when the phase's
    documents are saved."*

## `shared/rules/workflow-driver.md` and `shared/09-pr-automation.md`

32. **The driver and `shared.md` disagree about how work reaches `main`.** *(fix)*
    **Where:** driver §2 ("After code, before saying 'done'") and the §5 gate
    table, against `shared/rules/shared.md` "Git and PR conventions" and
    `shared/09-pr-automation.md`.
    **Problem:** the driver — the always-on file governing every ticket in
    Build — says *"Merge ticket branch into milestone branch, then push the
    milestone branch"*, and its gate table has rows for pushing branches but
    **none for opening a pull request**. Meanwhile `shared.md` states *"One
    peer review required before merge"* and `09-pr-automation.md` sets up
    branch protection requiring *"a pull request before merging"*. An agent
    following the driver literally merges every ticket locally and never opens
    a PR, so the peer review never happens.
    Worse, the ordering guarantees it. PR automation is **phase 11b** — after
    Build, Review, Test and Document. By the time CI and branch protection
    exist, the entire build has already been merged without them; and on a repo
    that *does* have protection from day one, the driver's step simply fails.
    **Fix:** give §0 a **Merge policy** setting, the way it already has variants
    for `Remote: none` and `Issue tracker: none` — `PR only` versus `local
    merge` — and branch §2 and the gate table on it. Add `Pull request` and `CI
    green` rows to the gates. Separately, consider whether
    `09-pr-automation.md` belongs near the start rather than at 11b: CI that
    arrives after the code is written cannot have gated any of it.

### Note, not a defect — for `CONTRIBUTING.md`

A vendored copy's post-pull scripts rot silently. The first project keeps
`apply-phase-config.ps1` and `strip-model-switching.ps1` to re-apply its
customisations after an upstream pull. The strip script's patterns were written
against older upstream wording; on one pull they matched nothing, so it
reported "0 files cleaned" while the tiering it existed to remove was still in
place. That is local tooling, not a Peer AI defect — but `CONTRIBUTING.md`
should warn maintainers of vendored copies to make such a script **fail loudly**
(non-zero exit when residue remains) rather than report success for doing
nothing. *(The React Native project hit the sibling of this — item 28 — where the script pointed
at the wrong directory entirely and still printed a clean summary. The common
cause is a customisation script with no way to say "I did nothing".)*

## Things that worked well

Recorded so fixes do not regress them.

- The **state file plus `CONTEXT.md` split** did its job. Every phase handoff was one JSON rewrite and a few narrative edits, and the "notes is a pointer, not a story" rule kept the state file readable.
- **Phase-gated documents** forced decisions in the right order. The currency picker request arrived mid-System-Spec and the trail (requirements → architecture → spec → contract) made it a set of tracked supersessions rather than a silent rewrite.
- The **contract phase's "who are you" step** adapted cleanly to a frontend-only v1 once the auth step was skipped.
- **Templates** gave every document a consistent header and made the outputs screenshot-ready without extra formatting.
