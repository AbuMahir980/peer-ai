> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — endpoint specs need full API context across validation, auth, and data flows. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in the model picker (bottom-left of the chat panel). Endpoint specs need deep reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

# 01 — Endpoint Specs (Backend)

**Context:** The API contract exists at `docs/04-api-contract.md`. Your job is to define implementation details for every endpoint so engineering can build against a single source of truth.

---

## 1. Load context

Read `docs/04-api-contract.md` and `docs/02-architecture.md`. Summarize what you learned in a few sentences (domains, major resources, constraints).

Ask:

> "Do these paths stay as `docs/04-api-contract.md` and `docs/02-architecture.md`, or should I read different files?"

**Wait for the user's input.**

---

## 2. Endpoint list and grouping

Produce a clear list of endpoints from the contract, **grouped by domain** (e.g. auth, customers, units, orders — use names that match the contract).

Then ask the user, for example:

> "Here is how I grouped the endpoints by domain. Does this grouping work for your team, or should we merge/split any groups before we drill into implementation?"

**Wait for the user's input.**

Adjust the grouping based on their answer before continuing.

---

## 3. Per-group implementation spec (repeat until all groups are done)

For **one endpoint group at a time**, work interactively. For each group, produce and refine:

### 3a. Controller layer

- Request validation (what to validate, where)
- Auth / authorization checks
- Call pattern into the service layer (what the controller passes and expects)

Ask, for example:

> "For this group, are there any endpoints that should be public, or is everything behind auth? Any role-specific rules I should encode here?"

**Wait for the user's input.**

### 3b. Service layer

- Business rules and invariants
- Data transformations (DTOs, mapping)
- Error handling strategy at the service boundary

Ask, for example:

> "Are there cross-cutting rules (e.g. tenancy, ownership) that apply to every operation in this group?"

**Wait for the user's input.**

### 3c. Database

- Tables touched per operation
- Joins and relationships
- Indexes you recommend (new or existing)

Ask, for example:

> "Do you already have migrations for these tables, or should this spec include a greenfield migration note?"

**Wait for the user's input.**

### 3d. External services

- Third-party APIs referenced in the contract — which calls, when, and timeouts
- Retry policy, idempotency, and failure handling

Ask, for example:

> "For external calls in this group, what is acceptable downtime behavior — fail the request, queue for retry, or degrade with a partial response?"

**Wait for the user's input.**

### 3e. Error scenarios

Present a **table** for this group: what can go wrong, suggested **error code** (if you use app codes), **HTTP status**, and **safe user-facing message** (and what to log).

Ask, for example:

> "Any domain-specific errors missing from this table (e.g. inventory conflicts, device offline)?"

**Wait for the user's input.**

Move to the **next** endpoint group only after the user is satisfied with the current group.

---

## 4. Middleware stack

Present a proposed middleware stack in order, for example: CORS, request ID / logging, body parser, auth, rate limiting, routes, central error handler.

Ask:

> "Does this order and set of middleware match your hosting and security requirements? Anything to add (e.g. request size limits, compression)?"

**Wait for the user's input.**

Update the spec based on their answer.

---

## 5. Database schema and migrations

Consolidate tables, relationships, indexes, and a **migration plan** (order of migrations, reversible steps, data backfill if any).

Ask:

> "Does this schema and migration plan align with your existing database and deployment process?"

**Wait for the user's input.**

Revise as needed.

---

## 6. Background jobs and queues

Identify which operations from the endpoint groups should run **asynchronously** (e.g. sending emails after signup, generating reports, syncing data with external systems, processing file uploads).

For each async task, specify: **trigger** (which endpoint or event kicks it off), **payload**, **expected duration**, **retry policy**, and **dead-letter handling**.

Ask:

> "Which operations in your system should happen in the background rather than blocking the HTTP response? Do you already have a queue system in mind (e.g. BullMQ, Celery, SQS, RabbitMQ, Sidekiq), or should we choose one?"

**Wait for the user's input.**

---

## 7. Scheduled tasks (cron jobs)

Identify recurring jobs the system needs: data cleanup, report generation, health checks, external data sync, token/session expiry sweeps, analytics rollups.

For each job, specify: **schedule** (cron expression or interval), **what it does**, **expected runtime**, **overlap handling** (skip if previous run is still going, or queue), and **failure alerting**.

Ask:

> "What tasks need to run on a schedule? Do you prefer framework-native scheduling, OS-level cron, or an external scheduler service?"

**Wait for the user's input.**

---

## 8. Webhooks and event hooks

Identify **inbound webhooks** the system must receive (payment provider callbacks, third-party notifications, IoT device events, CI/CD triggers) and **outbound events** the system emits (to other services, analytics, or partner integrations).

For inbound: specify **source**, **expected payload shape**, **signature verification method**, **idempotency key** (to prevent duplicate processing), and **response contract**.

For outbound: specify **trigger**, **payload**, **delivery mechanism** (direct HTTP, queue, event bus), and **retry behavior**.

Ask:

> "Which external systems will send webhooks to your API? Do any of your endpoints need to emit events to other services or event buses?"

**Wait for the user's input.**

---

## 9. File storage and uploads

Identify endpoints that handle **file uploads** (user avatars, documents, CSVs, images) or **file generation** (PDF reports, data exports).

For each, specify: **max file size**, **allowed MIME types**, **storage destination** (local disk, S3, GCS, Azure Blob, etc.), **path/key structure**, **access control** (signed URLs, public, authenticated), and **cleanup policy** (retention period, orphan deletion).

Ask:

> "Which endpoints involve file uploads or downloads? Where should files live — cloud storage (S3, GCS, Azure Blob), local disk, or a CDN? Any virus scanning or content validation requirements?"

**Wait for the user's input.**

---

## 10. Email and notifications

Identify where the system sends **transactional emails** (welcome, password reset, order confirmation), **push notifications**, or **SMS**.

For each notification type, specify: **trigger** (which endpoint or event), **template** (subject, body structure), **provider** (SendGrid, SES, Postmark, Twilio, etc.), **rate limits**, and **fallback behavior**.

Ask:

> "What emails or notifications does the system send? Do you have a provider already, or should we choose one? Any templating requirements (HTML email, plain text, both)?"

**Wait for the user's input.**

---

## 11. Caching strategy

Identify **read-heavy** endpoints or expensive computations that benefit from caching.

For each cacheable resource, specify: **cache layer** (in-memory, Redis, CDN, HTTP cache headers), **TTL**, **cache key pattern**, **invalidation strategy** (time-based, event-based, manual), and **stale-while-revalidate** behavior if applicable.

Ask:

> "Which data is read-heavy or expensive to compute? Do you already use a cache layer (Redis, Memcached, in-memory), or should we plan one? Any data that must never be cached?"

**Wait for the user's input.**

---

## 12. Real-time and WebSocket communication

Identify whether any features require **real-time data** (live dashboards, telemetry feeds, chat, notifications, collaborative editing). The API contract step may have already flagged real-time needs.

If real-time is needed, specify for each real-time feature: **transport protocol** (WebSocket, Server-Sent Events/SSE, MQTT, long polling), **event types** (what data flows and in which direction), **message format** (JSON payload shape), **connection lifecycle** (auth on connect, reconnection strategy, heartbeat interval), **scaling considerations** (sticky sessions, Redis pub/sub for multi-instance, connection limits), and **fallback behavior** (what happens if the real-time connection drops — poll? queue? show stale data?).

Ask:

> "Does any part of this system need real-time or live-updating data (e.g. live telemetry dashboards, notifications, chat, collaborative features)? If so, which transport makes sense — WebSocket, SSE, or something else? Should we define the message format and reconnection strategy now?"

**Wait for the user's input.** If no real-time features are in scope, skip this step.

---

## 13. Save the document

Write the full consolidated specification to:

**`docs/backend-endpoint-specs.md`**

Include: grouped endpoints, per-group controller/service/DB/external/error details, middleware stack, schema/migration summary, background jobs, scheduled tasks, webhooks, file storage, notifications, caching strategy, and real-time communication specs (if applicable).

Confirm with the user that the path is correct for their repo (some projects use `doc/` instead of `docs/`).

---

## 14. Handoff

Tell the user clearly:

> "Endpoint specs are done. Next, establish backend rules with **`.workflow/backend/02-rules.md`**."

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
