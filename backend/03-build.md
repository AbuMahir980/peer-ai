> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Composer 2** — code generation is where Composer 2 excels (beats Opus on coding benchmarks, 86% cheaper). Before starting, tell the user: "Before we begin, switch to **Composer 2** in your AI tool's model selector. It's built for coding and much more cost-efficient for building. If we hit a complex architectural decision mid-build, I'll tell you to switch to Opus 4.6 temporarily. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

# 03 — Build (Backend)

**Context:** Endpoint specs (`docs/backend-endpoint-specs.md`) and coding rules (`docs/backend-coding-rules.md`) should be in place. You are guiding implementation in the user's repository.

---

## 1. New or existing project

First, determine whether this is a new project or work on an existing codebase. Check for clues before asking — if earlier workflow docs exist (`docs/03-system-spec.md`, `docs/backend-endpoint-specs.md`) but there's no source code directory or dependency manifest (e.g. `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`), it's almost certainly a brand-new project. If code files already exist, it's likely continuation, new features, or refactoring.

If you can confidently infer the answer, confirm it:

> "I can see specs are in place but no code exists yet — this is a **brand-new** backend project. Sound right?"

Otherwise, ask:

> "Are we starting a **new** backend project or extending an **existing** codebase?"

**Wait for the user's input.**

- If **new**, ask about their stack before scaffolding:

> "What language and framework should we use? For example: Node.js (Express, Fastify, NestJS, Hono), Python (Django, Flask, FastAPI), Go (Gin, Echo, Chi), Ruby (Rails, Sinatra), Rust (Actix, Axum), or something else?"

**Wait for the user's input.** Then scaffold the chosen stack: install dependencies, create the agreed folder structure from `docs/backend-coding-rules.md`, add linting and formatting tools appropriate to the stack. Present what you created and any commands they should run locally.

- If **existing**: confirm stack versions and skip scaffolding; align with `docs/backend-coding-rules.md`.

---

## 2. Foundation

Plan and implement: database connection, centralized **config** (validate env vars), **error-handling** middleware, **structured logging**, and a **`/api/health`** (or documented health path) endpoint.

Ask:

> "I've outlined the foundation changes. Can you hit `/api/health` (or your chosen path) and confirm status 200 and expected body?"

**Wait for the user's input.**

Iterate if something fails.

---

## 3. Authentication

Implement: JWT validation **middleware**, **login** / **register** / **refresh** (or whatever the contract requires), and **role-based** route guards where specified.

Ask:

> "Please test auth with Postman, curl, or your API client — does login, protected route access, and refresh behave as expected?"

**Wait for the user's input.**

Fix issues before proceeding.

---

## 4. Endpoint groups (repeat)

Ask:

> "Which **endpoint group** should we build first? We'll follow `docs/backend-endpoint-specs.md`."

**Wait for the user's input.**

For the **chosen** group, implement in order:

1. Route file(s)
2. Controller(s) with validation schemas (using the library agreed in rules — Zod, Pydantic, etc.)
3. Service(s) with business logic
4. Model / query layer
5. External service wrappers if needed

Then ask:

> "Please exercise these endpoints with Postman or curl (happy path + one validation failure). What did you see?"

**Wait for the user's input.**

### Issue tracker update

Once the user confirms the endpoint group works, update the issue tracker ticket for this work:

1. **Tick acceptance criteria** — check off every completed checkbox in the ticket description. Use your issue tracker's MCP or API if available; otherwise list the items for the user to tick manually.
2. **Add a completion comment** — post a concise comment (3–5 bullets) on the issue: what was built, endpoints implemented, any deviations from the contract, any follow-ups.
3. **Add a project update** — post a one-sentence progress update to the issue tracker project (e.g. "Customer CRUD endpoints complete — all 5 endpoints validated against contract.").

If the issue tracker MCP is not connected, draft all three as text and tell the user to paste them in manually.

Repeat this step for **each** remaining endpoint group until the contract is covered (or the user explicitly scopes down).

---

## 5. External integrations

Integrate third-party APIs per spec: **service classes** (one per external system), **retries**, **timeouts**, and **circuit breaker** (or agreed resilience pattern). Test failure modes.

Ask:

> "Which external integration should we verify first in staging/sandbox, and do you have test credentials or mocks?"

**Wait for the user's input.**

---

## 6. Database migrations

Run and verify all database migrations. For a new project, generate the initial migration from the schema spec. For an existing project, create incremental migrations for new tables/columns.

Seed the database with test data if the spec calls for it (admin user, sample records, lookup tables).

Ask:

> "I've prepared the migration files. Can you run them against your dev database and confirm the tables/columns look correct? Any seed data we should load?"

**Wait for the user's input.**

---

## 7. Background jobs

If the spec includes async work (from `docs/backend-endpoint-specs.md` section on background jobs), implement: job definitions, queue setup, worker/consumer process, retry logic, and dead-letter handling.

Ask:

> "I've scaffolded the job definitions and worker setup. Can you start the worker process and trigger a test job to confirm it processes correctly?"

**Wait for the user's input.** If no background jobs are in scope, skip this step.

---

## 8. Scheduled tasks (cron)

If the spec includes recurring jobs, implement: task definitions, scheduler configuration (framework-native, node-cron, celery-beat, OS cron, or external scheduler per the rules), overlap protection, and failure alerting.

Ask:

> "I've set up the scheduled tasks. Can you verify the scheduler is running and the next execution time looks correct? Should any tasks run immediately for testing?"

**Wait for the user's input.** If no scheduled tasks are in scope, skip this step.

---

## 9. Webhooks

If the spec includes inbound webhooks, implement: receiver endpoints, signature verification middleware, idempotency checks (store processed event IDs), and payload processing.

If the spec includes outbound events, implement: event dispatcher, payload construction, delivery mechanism, and retry logic.

Ask:

> "I've built the webhook receivers. Can you send a test payload (or use the provider's test webhook feature) and confirm it processes correctly? Do you need me to set up a tunnel (like ngrok) for local testing?"

**Wait for the user's input.** If no webhooks are in scope, skip this step.

---

## 10. File handling

If the spec includes file uploads or downloads, implement: upload endpoints with size/type validation, storage integration (S3, GCS, local disk, etc.), signed URL generation for downloads, and cleanup jobs for orphaned files.

Ask:

> "I've set up file handling. Can you test uploading a file and retrieving it? Does the storage location and access pattern work for you?"

**Wait for the user's input.** If no file handling is in scope, skip this step.

---

## 11. Email and notifications

If the spec includes transactional emails or notifications, implement: notification service, provider integration (SendGrid, SES, Postmark, Twilio, etc.), templates, and queue-based dispatch (so sending never blocks HTTP responses).

Ask:

> "I've wired up the notification service. Can you trigger a test email/notification and confirm delivery? Are the templates and content correct?"

**Wait for the user's input.** If no notifications are in scope, skip this step.

---

## 12. Caching

If the spec includes caching, implement: cache layer setup (Redis, in-memory, etc.), cache-aside pattern for read-heavy endpoints, invalidation logic, and HTTP cache headers where appropriate.

Ask:

> "I've added caching to the identified endpoints. Can you hit them twice and confirm the second response is faster / served from cache? Does invalidation work when you update the underlying data?"

**Wait for the user's input.** If no caching is in scope, skip this step.

---

## 13. Real-time communication

If the spec includes real-time features (live dashboards, telemetry, notifications, chat), implement: WebSocket or SSE server setup, authentication on connection (token verification), event routing (which clients receive which events), message serialization, reconnection handling, and scaling setup (Redis pub/sub or equivalent for multi-instance deployments).

Ask:

> "I've set up the real-time layer. Can you open a connection and confirm you receive events when data changes? Does the reconnection behavior work if you temporarily disconnect?"

**Wait for the user's input.** If no real-time features are in scope, skip this step.

---

## 14. Hardening

Present a **checklist** appropriate to the stack: rate limiting, CORS, security headers (e.g. Helmet for Express, SecurityMiddleware for Django, secure headers for Go), input sanitization where relevant, dependency audit (`npm audit`, `pip audit`, `cargo audit`, etc.).

Work through each item with the user.

Ask:

> "Any security or compliance requirements beyond this checklist (e.g. IP allowlists, mTLS, WAF rules)?"

**Wait for the user's input.**

---

## 15. Final issue tracker project update

Before handing off, post a project-level update to the issue tracker project summarizing the full build phase:

> "[App name] backend build phase complete. [N] endpoint groups implemented, [migrations/jobs/webhooks/caching/real-time] set up as specified. Hardening checklist applied. Moving to code review and contract check."

If the issue tracker MCP is not connected, draft the update for the user to paste in manually.

---

## 16. Handoff

Tell the user:

> "Build is complete for the agreed scope. There are two agents that should run before the full review — I can kick them off **in parallel** to save time:
>
> 1. **Code review agent** — produces a structured findings report
> 2. **Contract check agent** — verifies your endpoints match the API contract
>
> Want me to run both now? I'll launch them as parallel background agents and summarise the results when they're done. Then we move to the full interactive review: `Follow peer-ai/backend/04-review.md`."

**If the user says yes:** launch both agents as parallel background tasks using `peer-ai/agents/review-prompt.md` and `peer-ai/agents/contract-check-prompt.md`. Summarise combined results when both complete.
**If they prefer sequential:** run code review first, then contract check.
**If they decline:** proceed directly to the review phase.

---

### Update workflow state

If `.peer-ai-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
