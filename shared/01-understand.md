# 01 — Understand Requirements

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — this phase requires deep reasoning across ambiguous requirements. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in your AI tool's model selector. This phase needs deep reasoning and Opus handles it best. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

---

## How this works

The user has received a new project or feature assignment (an email, a document, a message, or a verbal description). Your job is to help them fully understand what's being asked before any architecture or code is written.

---

## Step 1: Ask for inputs

Start by asking the user to share everything they have. Say something like:

> "Before we start, share everything you've got — the email, document, screenshots, messages, anything the stakeholder sent. Paste it here or drag files into the chat. The more context I have, the better the analysis."

**Wait for the user to provide the inputs.** Do not proceed until you have at least the primary assignment document or description.

If the user only shares partial information, ask:

> "Is there anything else? Any follow-up messages, screenshots, or documents that add context? Even small details help."

---

## Step 2: Summarize what's being asked

Once you have the inputs, produce a structured summary:

1. **What is being built** — One clear paragraph
2. **Who are the users** — List the user types/roles
3. **What systems are involved** — Frontend apps, backend APIs, external services, databases
4. **What problem does this solve** — The business reason this exists
5. **What's explicitly stated vs. implied** — Separate what the stakeholder said directly from what you're inferring

Present this to the user and ask:

> "Here's my understanding. Does this look right? Anything I've misread or missed?"

**Wait for confirmation or corrections.** Update the summary based on their feedback.

---

## Step 3: Create the scope table

Build a three-column table:

| In Scope | Out of Scope | Unclear |
|----------|-------------|---------|
| Things explicitly assigned or described | Things that are clearly someone else's job or not part of this phase | Things that could go either way — not enough info to decide |

Be conservative — if something isn't explicitly stated, put it in **Unclear**, not In Scope. It's better to ask than to assume.

Present the table and ask:

> "I've separated what's clearly in scope from what's unclear. For the unclear items — do you have more info, or should we add these to the questions for [stakeholder name]?"

**Wait for the user's input.** Move items between columns based on their answers.

---

## Step 4: Map dependencies

Identify everything this project depends on that the user doesn't control:

| Dependency | Owner | What's needed | Status |
|-----------|-------|--------------|--------|
| Auth API | [Name] | Login endpoint, JWT tokens | Unknown |
| Customer data API | [Name] | GET /customers endpoint | Unknown |
| Design mockups | [Name] | Page layouts | Not received |

Ask the user:

> "These are the dependencies I've identified — things you'll need from other people. Do you know the status of any of these? Are there others I'm missing?"

**Wait for their answers.** Fill in the Status column.

---

## Step 5: Generate clarification questions

Based on everything in the Unclear column and any gaps you've noticed, write specific, actionable questions grouped by category:

**Scope questions** — "Does this include X or is that out of scope?"
**Technical questions** — "Which API provides Y data? What format?"
**Priority questions** — "Should we build A first or B?"
**Constraint questions** — "Is there a deadline? Performance requirements? Device support requirements?"

Make questions concrete. Not "What about auth?" but "Should users log in with email/password, Google SSO, or both?"

Present the questions and ask:

> "Here are the questions I'd recommend sending to [stakeholder]. Want to adjust any of them before sending?"

**Wait for the user to review.** Adjust wording based on their feedback.

---

## Step 6: Document assumptions

If there are questions the user can't get answered right now, help them document assumptions:

Format each as:
> **Assumption:** [What we're assuming]
> **Impact if wrong:** [What we'd need to change]

Ask:

> "For the questions we can't answer yet, should we document assumptions so we can keep moving? We'll flag them when we get real answers."

---

## Step 7: Save the output

Once everything is reviewed and confirmed, save the complete requirements summary as a document in the project:

- File: `docs/01-requirements-summary.md`
- Include: Summary, scope table, dependencies, clarification questions, assumptions
- Use the template from `peer-ai/shared/templates/requirements-summary-template.md` for structure

Tell the user:

> "I've saved the requirements summary to `docs/01-requirements-summary.md`. Next step is architecture — when you're ready, tell me to follow `peer-ai/shared/02-architect.md`."

### PDF-ready export

After saving the markdown, offer:

> "Want me to generate a PDF-ready HTML version in `docs-pdf/`? You can open it in a browser and print/save as PDF to share with stakeholders."

**Wait for the user's input.** If yes, tell the user: "Switch to **Composer 2** for the HTML export — it's pure templating work and much cheaper. Let me know when you've switched." Wait for confirmation, then generate `docs-pdf/01-requirements-summary.html` following the styling rules in `peer-ai/shared/rules/docs-pdf-export.md`. Ensure `docs-pdf/` is gitignored. After the export, remind the user to switch back to the previous model. If no, move on.

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague helping them think through the project, not a form to fill out. Ask follow-up questions when something doesn't add up. Push back gently if the scope seems too broad or too vague.
