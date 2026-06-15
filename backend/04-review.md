> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Sonnet 4.6** — code review is systematic and checklist-driven; Sonnet handles it well at 40% less cost. Before starting, tell the user: "Before we begin, switch to **Sonnet 4.6** in your AI tool's model selector. It's near-Opus quality for review work at lower cost. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

# 04 — Code Review (Backend)

**Context:** The backend is implemented. You will review the codebase systematically against the contract, architecture, and security expectations.

---

## 1. Set expectations

Tell the user:

> "I'll review the backend systematically: I'll go category by category, show findings for each before moving on. If you have a preferred entry branch or folder, tell me now."

Ask:

> "Is there anything you already know is rough (WIP endpoints, temporary mocks) that I should treat as out of scope?"

**Wait for the user's input.**

---

## 2. Review by category (one category at a time)

For **each** category below, inspect the code and **present findings** before advancing:

### 2a. Functionality

- Endpoints match **`docs/04-api-contract.md`**
- Request/response shapes, status codes, and error envelopes align with the contract

Ask:

> "Any endpoints intentionally diverging from the contract (versioning, deprecation)?"

**Wait for the user's input.**

### 2b. Architecture

- Layered pattern: route → controller → service → model
- **No** business logic in controllers
- **No** HTTP concepts in services

Ask:

> "Are there any documented exceptions to strict layering in this repo?"

**Wait for the user's input.**

### 2c. Security

- SQL injection prevention (parameterized queries / ORM)
- Input validation on **all** mutating and sensitive read endpoints
- Auth middleware on protected routes
- Rate limiting, secrets handling, CORS, security headers (e.g. helmet)
- No stack traces or internal details leaked to clients

### 2d. Error handling

- Custom error types and central middleware
- No silent unhandled rejections; async errors reach the handler
- Errors logged with **context** (request ID, user id where safe)

### 2e. Database

- Parameterized queries; migrations reversible where possible
- Indexes match hot paths from the spec
- No obvious **N+1** query patterns; connection pooling configured

### 2f. Performance

- Pagination on list endpoints
- No unnecessary blocking on the event loop for heavy work
- Caching only where agreed and safe

### 2g. API contract compliance

- Compare **actual** responses to **`docs/04-api-contract.md`** (including field names and nullability)

### 2h. Background jobs and scheduled tasks *(if implemented)*

- Jobs are idempotent (safe to retry without side effects)
- Dead-letter queues configured for failed jobs
- Retry limits and backoff strategy in place
- Scheduled tasks have overlap protection (won't run concurrently if previous run is still going)
- Job payloads don't contain sensitive data in plain text
- Queue connection failures handled gracefully (app doesn't crash if the queue is down)

### 2i. Caching *(if implemented)*

- Cache keys are consistent and namespaced (no collisions between resources)
- TTLs are set on all cached entries (no unbounded cache growth)
- Cache invalidation happens on writes (no stale data for critical operations)
- Sensitive data is not cached (auth tokens, PII)
- Cache failures don't crash the app (graceful fallback to DB)

### 2j. Webhooks *(if implemented)*

- Inbound webhook endpoints verify signatures from the sender
- Idempotency keys tracked to prevent duplicate processing
- Heavy processing offloaded to background jobs (webhook endpoint responds quickly)
- Outbound webhooks use retry with backoff on delivery failure
- Webhook secrets stored securely (env vars, not hardcoded)

### 2k. File handling *(if implemented)*

- Upload size limits enforced at the middleware level
- MIME type validation (not just file extension)
- Files stored with safe key names (no user-controlled file paths that could lead to path traversal)
- Signed URLs used for private file access (not public by default)
- Orphaned file cleanup scheduled or triggered on resource deletion

### 2l. Email and notifications *(if implemented)*

- Sending is queue-backed (never blocks HTTP responses)
- Templates are separate from business logic
- No sensitive data in plain text in email bodies or push notification payloads
- Unsubscribe/opt-out mechanism if applicable

### 2m. Real-time communication *(if implemented)*

- WebSocket/SSE connections require authentication
- Reconnection strategy handles token refresh
- Event broadcast is scoped (users only receive events they're authorized to see)
- Connection limits and cleanup for stale connections
- Multi-instance scaling handled (Redis pub/sub or equivalent)

After each major category, pause briefly so the user can react — especially if they want to correct a false positive.

---

## 3. Severity rollup

Present **all** findings grouped by severity:

- **Critical** — security holes, data loss risk, contract-breaking bugs
- **Warning** — reliability, maintainability, likely production pain
- **Info** — style, minor optimizations, documentation gaps

---

## 4. Offer fixes

Ask:

> "Do you want me to fix the **Critical** and **Warning** issues in the codebase now?"

**Wait for the user's input.**

---

## 5. Fix and re-verify

If they said yes: implement fixes, then re-check the affected areas. Summarize what changed.

If they said no: capture a concise follow-up list they can track elsewhere.

---

## 6. Handoff

Tell the user:

> “Review complete for this pass. There are two agents that should run before testing — I can kick them off **in parallel** so you’re not waiting on them one at a time:
>
> 1. **Security audit agent** — catches auth, XSS, CORS, and secrets issues the general review missed
> 2. **Code review agent** — produces a structured findings report for the record
>
> Want me to run both now? I’ll launch them as parallel background agents and summarise the results when they’re done. Then we move to tests: Follow peer-ai/backend/05-test.md.”

**If the user says yes:** launch both agents as parallel background tasks using peer-ai/agents/security-audit-prompt.md and peer-ai/agents/review-prompt.md. Summarise combined results when both complete.
**If they prefer sequential:** run security audit first, then code review.
**If they decline:** proceed directly to testing.

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You’re a senior colleague.
