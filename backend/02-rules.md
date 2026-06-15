> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — track rules require reasoning about project-wide consistency. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in your AI tool's model selector. Setting rules needs careful reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

# 02 — Backend Rules

**Context:** You are setting up or confirming backend coding standards so the team implements the API consistently and safely.

---

## 1. Project structure

Present a **recommended folder layout**, for example:

- `src/routes`, `controllers`, `services`, `models`, `middleware`, `utils`, `types`, `config`, `db`, `external`, `jobs` (adjust names and nesting to match common patterns for your framework — e.g. `app/` for Django/Rails, `src/` for Node/Go, `lib/` for Elixir).

Ask:

> "Does this structure fit your repo, or should we rename/move anything (e.g. `repositories` instead of `models`, `lib` vs `utils`)?"

**Wait for the user's input.**

---

## 2. Layered architecture

Explain the rule: **route → controller → service → model** (no skipping layers) and briefly **why** (testability, single responsibility, predictable errors).

Ask:

> "Are you aligned with strict layering, or do you allow thin 'handler' files that combine route + controller for trivial endpoints?"

**Wait for the user's input.**

---

## 3. Controller rules

Describe: validate input, call service, shape HTTP response; **no business logic** in controllers.

Ask:

> "Any exceptions you want (e.g. trivial pagination defaults in the controller)?"

**Wait for the user's input.**

---

## 4. Service rules

Describe: all business logic lives here; throw **typed** domain/application errors; **no** HTTP request/response objects, status codes, or headers in services (keep them transport-agnostic).

Ask:

> "Do you prefer a specific error type hierarchy naming convention for your codebase?"

**Wait for the user's input.**

---

## 5. Database rules

Cover: ORM or query builder choice, **parameterized** queries only, migrations workflow, **transactions** for multi-step writes.

Ask:

> "Which database stack are you committed to (e.g. Prisma, Drizzle, Knex, TypeORM, SQLAlchemy, Django ORM, ActiveRecord, raw driver)? Any multi-tenant rules for queries?"

**Wait for the user's input.**

---

## 6. Error handling pattern

Present: custom error classes, central error middleware, **log full detail** / **return safe messages** to clients.

Ask:

> "Should 5xx responses include a stable `requestId` for support, and do you want error codes in the JSON body for all errors?"

**Wait for the user's input.**

---

## 7. Auth middleware

Present: JWT validation (or session) flow, role/claims extraction, route guards / RBAC pattern.

Ask:

> "Are roles static enums, or do you need resource-level permissions (e.g. 'can edit unit X')?"

**Wait for the user's input.**

---

## 8. Input validation

Present: schema-based validation at the controller (or boundary) level; invalid input → **422** with **field-level** errors where possible. Recommend a validation library appropriate to their stack (e.g. Zod/Joi for Node, Pydantic for Python, class-validator for NestJS, marshmallow for Flask, built-in validators for Django/Rails).

Ask:

> "Which validation library does your project already use, or should we pick one now? (e.g. Zod, Joi, Pydantic, class-validator, marshmallow)"

**Wait for the user's input.**

---

## 9. Logging

Present: structured **JSON** logs, **request ID** propagation, sensible log levels (error/warn/info/debug).

Ask:

> "Where do logs go in your environments (stdout, file, aggregator like Datadog/Loki/CloudWatch)? Any PII redaction rules? Which logging library fits your stack (e.g. Pino/Winston for Node, structlog for Python, Logrus/Zap for Go)?"

**Wait for the user's input.**

---

## 10. Environment configuration

Present: centralized config module, **validate env vars on startup**, **fail fast** if misconfigured.

Ask:

> "Do you use a schema validator for env vars (e.g. `envalid`/Zod for Node, `pydantic-settings` for Python, `envconfig` for Go), and do you have separate config files per stage?"

**Wait for the user's input.**

---

## 11. Background job conventions

Present rules for async work: queue naming conventions, job serialization format, retry policy (max attempts, backoff), dead-letter queue handling, idempotency requirements, and job monitoring/alerting.

Ask:

> "Does your project need background jobs? If so, what queue system will you use (e.g. BullMQ, Celery, Sidekiq, SQS, RabbitMQ), and do you have conventions for naming queues and handling retries?"

**Wait for the user's input.** If the user says no async work is needed, note that and move on.

---

## 12. Caching conventions

Present rules for caching: cache key naming patterns, TTL strategy (global default vs per-resource), invalidation approach (event-based, time-based, manual), and what must **never** be cached (user-specific auth data, in-flight transactions).

Ask:

> "Do you plan to use caching? If so, which layer (Redis, Memcached, in-memory, HTTP cache headers, CDN)? Any data that should explicitly not be cached?"

**Wait for the user's input.** If the user says no caching is needed, note that and move on.

---

## 13. File storage conventions

Present rules for file handling: upload size limits, allowed MIME types, storage path/key structure, signed URL policy, cleanup/retention, and virus scanning if applicable.

Ask:

> "Does your project handle file uploads or generate downloadable files? If so, where do files live (S3, GCS, Azure Blob, local disk) and what are your size/type limits?"

**Wait for the user's input.** If the user says no file handling is needed, note that and move on.

---

## 14. API versioning

Present options: URL path versioning (`/api/v1/`), header-based versioning, or no versioning (with a deprecation strategy). Recommend based on the project's scope and timeline.

Ask:

> "Do you need API versioning from the start, or is a single version fine for now? If versioned, do you prefer URL-based (`/v1/`) or header-based?"

**Wait for the user's input.**

---

## 15. Testing conventions

Present rules for testing: unit tests (service/utility logic), integration tests (API endpoints with real or test DB), E2E tests if applicable, test file naming/colocation, fixture patterns, mocking external services, and coverage targets.

Ask:

> "What testing framework does your stack use (e.g. Jest/Vitest for Node, pytest for Python, go test, RSpec for Ruby)? What coverage target feels right — 80%? 90%? And should tests live next to source files or in a separate `tests/` directory?"

**Wait for the user's input.**

---

## 16. Deployment conventions

Present rules for deployment: Dockerfile expectations (multi-stage builds, non-root user), CI/CD pipeline requirements (lint, type-check, test, build must pass), environment management (dev, staging, production), secrets handling (vault, env vars, cloud secrets manager), and health check endpoints.

Ask:

> "How do you deploy — Docker, serverless, PaaS (Heroku/Railway/Render), or bare metal? Do you have CI/CD already (GitHub Actions, GitLab CI, etc.), or should we define the pipeline from scratch?"

**Wait for the user's input.**

---

## 17. Monitoring and observability

Present rules beyond structured logging: **health check enrichment** (the `/api/health` endpoint should report DB connectivity, queue status, cache reachability, and external service status — not just 200 OK), **APM integration** (Datadog, New Relic, Sentry, OpenTelemetry — instrument key operations for latency tracing), **custom metrics** (request latency percentiles, error rates by endpoint, queue depth, job processing time, cache hit/miss ratios), and **alerting strategy** (what triggers an alert, who gets notified, severity levels).

Ask:

> "Do you need monitoring beyond logs? If so, what APM or observability platform do you use (Datadog, New Relic, Grafana/Prometheus, Sentry, OpenTelemetry)? What should trigger alerts — error rate spikes, latency thresholds, queue backlogs?"

**Wait for the user's input.** If the user says monitoring is a later concern, note that and move on — but recommend at minimum enriching the health check endpoint.

---

## 18. Save the document

Write the agreed rules to:

**`docs/backend-coding-rules.md`**

Include all decisions from the conversation: structure, layering, controller/service/DB/error/auth/validation/logging/config, background jobs, caching, file storage, API versioning, testing, deployment, and monitoring/observability conventions.

---

## 19. Handoff

Tell the user:

> "Backend rules are captured. Next, create issues before building — follow **`peer-ai/shared/06-issues.md`**."

---

### Update workflow state

If `.peer-ai-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
