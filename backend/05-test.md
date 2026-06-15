> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Composer 2 or Sonnet 4.6** — test writing is well-scoped implementation work. Before starting, tell the user: "Before we begin, switch to **Composer 2** in the model picker (bottom-left of the chat panel) — it's fastest and cheapest for generating tests. If your tests need nuanced edge-case reasoning, use **Sonnet 4.6** instead. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

# 05 — Testing (Backend)

**Context:** Implementation exists and review may be done. You will add or run tests and align them with the API contract.

---

## 1. Test toolchain

Ask:

> "What test runner and HTTP test libs are already in the project (e.g. Vitest, Jest, Mocha)? Is **Supertest** (or similar) installed?"

**Wait for the user's input.**

If needed, propose adding **Vitest** or **Jest** plus **Supertest**, wire npm scripts, and minimal config. Confirm with the user before large config changes.

Ask:

> "Should tests live in `src/**/*.test.ts`, a top-level `tests/` folder, or match your existing convention?"

**Wait for the user's input.**

---

## 2. Unit tests (services)

Write unit tests for **service** functions: mock the database layer and external HTTP clients; cover happy paths, domain errors, and edge cases per `docs/backend-endpoint-specs.md`.

Ask:

> "Which service module is highest risk or most complex — should we prioritize extra cases there?"

**Wait for the user's input.**

---

## 3. Integration tests (HTTP)

Using **Supertest** (or equivalent), test the full **request → response** cycle:

- Auth flows (valid token, missing token, wrong role)
- Validation errors (**422** with field errors where applicable)
- Each **endpoint group** from the specs

Ask:

> "Do you want integration tests to hit a real test DB, or an in-memory / dockerized database?"

**Wait for the user's input.**

---

## 4. Database tests

Add tests for: migrations **up** and **down**, complex queries (correctness), and important **constraints** (uniqueness, FKs) if not covered elsewhere.

Ask:

> "Is there a CI database URL or docker-compose service name I should assume for local runs?"

**Wait for the user's input.**

---

## 5. Contract tests

Add tests that assert response **shapes** (and key fields) match **`docs/04-api-contract.md`** — snapshot or schema-based checks as appropriate.

Ask:

> "Should contract tests be strict (exact keys) or allow optional fields the backend may omit when null?"

**Wait for the user's input.**

---

## 6. Background job tests *(if jobs are implemented)*

Test that: jobs are dispatched when expected (the correct trigger enqueues the correct job with the correct payload), jobs process successfully (mock external dependencies, verify side effects), retry logic works (simulate failure, verify retry count and backoff), and dead-letter handling triggers on max retries.

Ask:

> "Should I test jobs by dispatching to a real queue instance (Redis, etc.) or by mocking the queue client? Do you have test fixtures for job payloads?"

**Wait for the user's input.** If no background jobs exist, skip this step.

---

## 7. Scheduled task tests *(if cron jobs are implemented)*

Test that: scheduled tasks execute the expected logic, overlap protection works (if a task is already running, the next invocation skips or queues), and failure handling triggers alerts or logs correctly. Use time-mocking if the scheduler depends on real time.

Ask:

> "How should we test scheduled tasks — invoke the task function directly, or simulate the scheduler trigger? Any tasks that touch external systems we should mock?"

**Wait for the user's input.** If no scheduled tasks exist, skip this step.

---

## 8. Webhook tests *(if webhooks are implemented)*

Test that: **inbound** webhook endpoints verify signatures correctly (valid signature → process, invalid → 401/403), idempotency works (sending the same event twice doesn't double-process), and heavy processing is offloaded to a job (the endpoint responds quickly). Test that **outbound** webhook dispatch constructs the correct payload and retries on delivery failure.

Ask:

> "Do you have sample webhook payloads from the provider(s) I can use as test fixtures? Should I test signature verification with both valid and tampered payloads?"

**Wait for the user's input.** If no webhooks exist, skip this step.

---

## 9. File handling tests *(if file uploads are implemented)*

Test that: upload endpoints reject files exceeding size limits, reject disallowed MIME types, store files to the correct location, and return the correct access URL or signed URL. Test that file deletion or cleanup works. Mock the storage backend (S3, GCS) in unit tests; use real storage in integration tests if a test bucket is available.

Ask:

> "Should file upload tests use real cloud storage (test bucket) or mocked storage? Any edge cases you're worried about (large files, special characters in filenames, concurrent uploads)?"

**Wait for the user's input.** If no file handling exists, skip this step.

---

## 10. Real-time communication tests *(if WebSocket/SSE is implemented)*

Test that: connections require valid authentication (reject unauthenticated connections), events are scoped correctly (users only receive authorized events), reconnection after disconnect re-authenticates, and message format matches the spec. Use a WebSocket test client or library (e.g. `ws` for Node, `websocket-client` for Python).

Ask:

> "Should I test real-time communication with a real WebSocket/SSE connection or mock the transport layer? Are there specific event sequences we should verify?"

**Wait for the user's input.** If no real-time features exist, skip this step.

---

## 11. Load testing (optional)

Discuss **autocannon** or **k6** for critical endpoints (login, high-traffic reads, webhooks). Only proceed if the user wants this now.

Ask:

> "Do you want load-test scripts in-repo now, or is that a later phase?"

**Wait for the user's input.**

---

## 12. Run tests

Run the full test suite (or the subset you added) and **present results** (pass/fail, relevant error output).

Ask:

> "Should I treat warnings from the runner as blocking, or only failures?"

**Wait for the user's input.**

---

## 13. Fix failures

Fix failing tests or implementation bugs uncovered by tests. Re-run until green or until the user accepts known gaps.

Ask:

> "Any flaky tests in CI history I should watch for (timing, shared state)?"

**Wait for the user's input.**

---

## 14. Coverage

Present a **coverage summary** (line/branch if configured). Call out untested critical paths.

Ask:

> "Do you have a minimum coverage target for this repo?"

**Wait for the user's input.**

---

## 15. Handoff

Tell the user:

> "Testing complete for this pass. Before documenting, run a QA verification to confirm all acceptance criteria are covered:
>
> **QA agent:** `Follow .workflow/agents/qa-prompt.md`
>
> The QA agent will produce a test matrix showing pass/fail/untested for every acceptance criterion and suggest any missing automated tests.
>
> After that, document the API and runbooks: `Follow .workflow/shared/07-document.md`."

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
