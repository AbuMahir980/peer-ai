# 08 — Dev Journey Journal

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Auto or Gemini Flash** — journal entries are templated writing. Before starting, tell the user: "Before we begin, switch to **Auto** or **Gemini Flash** in your AI tool's model selector. Journal writing is templated work — no need for a premium model. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** This file serves two purposes: (1) **initial setup** of your dev journal at the start of a project, and (2) **end-of-cycle retrospective** to review all journal entries and synthesize lessons learned. During normal workflow phases, journal entries are triggered automatically by the AI at key decision moments and phase handoffs — you don't need to come back to this file for individual entries.

---

## Part A: Journal Setup (run once per project)

### 1. Choose your journal tool

Ask:

> "The dev journal captures your decisions, trade-offs, problems solved, and lessons learned throughout the project. It builds automatically as we work — I'll offer to write entries at key moments and at the end of each phase.
>
> Which tool do you want to use for your journal?
>
> **A) Notion (MCP)** — I'll create a Notion database and write entries directly to it. Requires the Notion MCP server configured in Cursor.
>
> **B) Local markdown (Obsidian-compatible)** — I'll create a `docs/journal/` folder in your repo with dated markdown files. Works with Obsidian, any markdown viewer, or just your editor.
>
> **C) Another tool** — Tell me what you use and I'll adapt.
>
> **D) Skip journaling** — No journal for this project.
>
> Which do you prefer: A, B, C, or D?"

**Wait for the user's input.**

---

### 2. Configure the journal tool

**If A (Notion MCP):**

- Check if the Notion MCP server is already configured in Cursor. If not, guide setup:
  1. Open Cursor Settings → MCP → Add new global MCP server
  2. Add: `{ "mcpServers": { "notion": { "url": "https://mcp.notion.com/mcp" } } }`
  3. Save and restart Cursor
  4. Complete the OAuth flow when prompted
- Ask the user which Notion workspace and parent page to use:

> "Which Notion workspace should I create the journal in? And is there a specific page I should create it under, or should I create a new top-level page?"

**Wait for the user's input.**

- Create a Notion database called "[Project Name] — Dev Journal" with these properties:
  - **Date** (date)
  - **Phase** (select: Understand, Architect, System Spec, API Contract, Rules, Page Specs, Endpoint Specs, Issues, Build, Review, Test, Document)
  - **Title** (title)
  - **Type** (select: Decision, Trade-off, Problem Resolved, Lesson, Phase Summary, Retrospective)
  - **Tags** (multi-select, user can add custom tags)
- Confirm the database was created:

> "I've created the journal database in Notion. Here's the link: [link]. Each entry will appear as a row with the date, phase, type, and a rich content page. Does this look right?"

**Wait for the user's input.**

- Save the journal config to `docs/journal-config.json`:
```json
{
  "tool": "notion",
  "notionDatabaseId": "<database-id>",
  "projectName": "<project-name>"
}
```

**If B (Local markdown):**

- Create the folder structure:
  - `docs/journal/` — all journal entries go here
  - `docs/journal/README.md` — index explaining the journal structure
- Create `docs/journal/README.md`:
```markdown
# Dev Journal

This folder contains the development journey for this project.
Each entry captures decisions, trade-offs, problems, and lessons learned.

## File naming
`YYYY-MM-DD-phase-brief-title.md`

## Entry types
- **Decision** — architecture or technology choice with reasoning
- **Trade-off** — what was considered, what was chosen, and why
- **Problem Resolved** — issue encountered and how it was fixed
- **Lesson** — insight gained during development
- **Phase Summary** — end-of-phase recap
- **Retrospective** — end-of-cycle synthesis
```
- Save the journal config to `docs/journal-config.json`:
```json
{
  "tool": "local",
  "journalPath": "docs/journal",
  "projectName": "<project-name>"
}
```
- Confirm:

> "I've created `docs/journal/` with an index file. Entries will be saved as dated markdown files. This works with Obsidian, VS Code, or any markdown viewer. Ready to go?"

**Wait for the user's input.**

**If C (another tool):**

- Ask which tool and whether it has an MCP server or API
- If MCP available, guide setup and create a similar structure
- If no MCP, explain that entries will be drafted in chat and the user can paste them into their tool
- Save config to `docs/journal-config.json` with `"tool": "other"` and any relevant details

**If D (skip):**

- Save config to `docs/journal-config.json`:
```json
{
  "tool": "none"
}
```
- Tell the user:

> "No problem. If you change your mind later, just run: `Follow peer-ai/shared/08-dev-journal.md` to set it up."

---

### 3. First entry — project kickoff

If the user chose A, B, or C, draft the first journal entry:

> "Let's write the first entry — a project kickoff capturing why this project exists, the key constraints, and your initial expectations."

Draft an entry using the template below, filling in from the context you have (project specs, architecture docs, etc.):

```markdown
## [Date] — Kickoff: [Project Name]

**What:** Starting [project name] — [one-line description]

**Why:** [Business reason / stakeholder need]

**Key constraints:**
- [Constraint 1]
- [Constraint 2]

**Initial expectations:**
- [What you expect to be straightforward]
- [What you expect to be challenging]

**Team:** [Who's involved and their roles]

**Open questions:**
- [Question 1]
- [Question 2]
```

Present the draft and ask:

> "Here's a kickoff entry based on what we know so far. Want to edit anything before I save it?"

**Wait for the user's input.** Then save to the configured tool.

---

## Part B: Journal Entry Template

This is the template the AI uses when writing entries during workflow phases. It is referenced by the journal nudges in each workflow file.

### Key moment entry (mid-phase)

```markdown
## [Date] — [Phase]: [Brief title]

**What:** [What was decided or resolved]

**Why:** [Reasoning behind the choice]

**Alternatives considered:**
- [Option A] — [why rejected]
- [Option B] — [why rejected]

**Trade-offs:** [What was gained vs what was sacrificed]

**Impact:** [What this affects downstream]
```

### Phase summary entry (end of phase)

```markdown
## [Date] — Phase Complete: [Phase Name]

**What was accomplished:**
- [Deliverable 1]
- [Deliverable 2]

**Key decisions made:**
- [Decision 1] — [brief reasoning]
- [Decision 2] — [brief reasoning]

**Problems encountered:**
- [Problem] — [how it was resolved]

**Lessons learned:**
- [Lesson 1]
- [Lesson 2]

**What I'd do differently:**
- [Insight]

**Open questions carried forward:**
- [Question 1]
```

---

## Part C: End-of-Cycle Retrospective

Run this section at the end of a development cycle (after `07-document.md`), or whenever the user wants to reflect on progress.

### 1. Gather all entries

- If Notion: query the journal database for all entries in this cycle
- If local markdown: read all files in `docs/journal/`
- If other tool: ask the user to provide or paste entries

Tell the user:

> "I've read all [N] journal entries from this cycle. Let me synthesize the patterns."

---

### 2. Synthesize themes

Analyze all entries and present:

> "Here's what I see across your journal entries this cycle:
>
> **Recurring decisions:** [patterns in what was decided frequently]
>
> **Biggest trade-offs:** [the decisions that had the most downstream impact]
>
> **Most common problems:** [what kept coming up]
>
> **Growth areas:** [skills or knowledge that developed during this cycle]
>
> **Process insights:** [what worked well vs what was friction in the workflow itself]
>
> Does this match your experience? Anything to add or correct?"

**Wait for the user's input.**

---

### 3. Write the retrospective entry

Draft a comprehensive retrospective entry and save it:

```markdown
## [Date] — Retrospective: [Cycle/Milestone Name]

**Cycle scope:** [What was built this cycle]

**Duration:** [Start date] — [End date]

**Entries written:** [N] entries across [phases]

### Decision patterns
- [Pattern 1]
- [Pattern 2]

### Biggest wins
- [Win 1]
- [Win 2]

### Biggest challenges
- [Challenge 1 — how resolved]
- [Challenge 2 — how resolved]

### Growth
- [What you learned technically]
- [What you learned about process]

### Carry forward
- [What to keep doing]
- [What to change]
- [Open questions for next cycle]
```

Present and confirm:

> "Here's the retrospective. Want to edit anything before I save it?"

**Wait for the user's input.** Save to configured tool.

---

### 4. Close

Tell the user:

> "Retrospective saved. Your journal now has a complete record of this cycle — decisions, trade-offs, problems, lessons, and reflections. If starting a new cycle, go to `peer-ai/shared/01-understand.md`."

---

## Tone

Be reflective and encouraging. The journal is a growth tool, not a chore. Help the user see patterns in their own work and celebrate progress.
