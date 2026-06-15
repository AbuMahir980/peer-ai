---
description: Backend coding standards for API projects
globs: src/**/*.{ts,js,py,go,rs,rb}, app/**/*.{ts,js,py,rb}, lib/**/*.{ts,js,rb,ex}
alwaysApply: true
---

# Backend Standards

You are working on a backend application. Adapt these standards to the project's framework and language (Node.js/Express/Fastify/NestJS, Python/Django/FastAPI/Flask, Go/Gin/Echo, Ruby/Rails, etc.).

## Project structure
```
src/ (or app/, lib/ depending on framework)
  routes/         -- Route definitions (maps URLs to controllers/handlers)
  controllers/    -- Request handling (validate, call service, format response)
  services/       -- Business logic (all domain logic lives here)
  models/         -- Database models/schemas/repositories
  middleware/     -- Auth, rate limiting, logging, error handling
  utils/          -- Pure utility functions
  types/          -- Type definitions (TypeScript, Pydantic models, Go structs, etc.)
  config/         -- Centralized configuration (env vars, constants)
  db/             -- Database connection, migrations, seeds
  external/       -- External service clients (third-party APIs)
  jobs/           -- Background job definitions and workers
```

## Layered architecture
```
Route -> Controller -> Service -> Model/DB
```
- Routes: Define HTTP method + path, apply middleware, call controller
- Controllers: Validate input, call service, format HTTP response. NO business logic.
- Services: All business logic. Throw typed errors. NO HTTP concepts (no status codes, no request/response objects).
- Models: Database access. Parameterized queries only. Return typed data.

Never skip layers. A route must not call a model directly.

## Input validation
- Validate ALL input at the controller/handler level using the stack's validation library (Zod, Joi, Pydantic, class-validator, marshmallow, etc.)
- Return 422 with field-level errors for invalid input
- Never trust client input -- validate types, ranges, formats
- Sanitize strings to prevent injection

## Error handling
- Define custom error classes (NotFoundError, AuthError, ValidationError, etc.)
- Each error class has an error code (string enum) and HTTP status
- Central error middleware catches all errors and formats the response
- Log the full error (with stack trace) server-side
- Return a safe error message to the client (no internals, no stack traces)

## Authentication & authorization
- Auth middleware on all protected routes (JWT, session, OAuth -- match the project's approach)
- Extract user role from token/session, attach to request context
- Role-based route guards: check role before executing controller logic
- Refresh token flow where applicable: short-lived access token + long-lived refresh token

## Database
- Use parameterized queries or an ORM -- NEVER concatenate user input into SQL
- All schema changes via migrations (up and down / reversible)
- Index foreign keys and frequently queried columns
- Use transactions for multi-step writes
- Connection pooling enabled

## Background jobs and queues
- Async work (email sending, report generation, data sync) must run in background jobs, not block HTTP responses
- Use the project's queue system (BullMQ, Celery, Sidekiq, SQS, RabbitMQ, etc.)
- Every job must be idempotent -- safe to retry on failure
- Define retry limits and dead-letter handling for failed jobs
- Monitor queue depth and job processing time

## Scheduled tasks (cron)
- Recurring work (cleanup, sync, reports, health checks) via framework scheduler or external cron
- Prevent overlapping runs (skip if previous execution is still running)
- Log start/end/duration of each scheduled run
- Alert on failure or unexpected duration

## Webhooks
- Inbound: verify signatures, enforce idempotency (track processed event IDs), respond quickly (offload heavy processing to a job)
- Outbound: use reliable delivery (queue-backed), include retry with exponential backoff

## File storage
- Upload size and MIME type limits enforced at the middleware level
- Store files in cloud storage (S3, GCS, Azure Blob) or local disk per project config
- Use signed URLs for private file access
- Clean up orphaned files on a schedule

## Email and notifications
- All notification dispatch goes through a dedicated service (never send directly from controllers)
- Use queue-backed sending so HTTP responses are never blocked
- Templates stored separately from business logic

## Caching
- Cache read-heavy, infrequently-changing data (Redis, in-memory, HTTP cache headers)
- Use consistent key naming: `{resource}:{id}:{field}` or similar
- Invalidate on writes -- never serve stale data for critical operations
- Set TTLs on all cached entries

## API response format
Standard envelope for success responses:
```json
{
  "success": true,
  "data": {},
  "message": "optional human-readable message",
  "timestamp": "ISO8601"
}
```
Standard envelope for error responses:
```json
{
  "success": false,
  "message": "user-safe error summary",
  "code": "MACHINE_ERROR_CODE",
  "details": {}
}
```
If the project uses a different envelope (e.g. `data/error/meta` with `requestId`), follow whatever was agreed in `docs/04-api-contract.md` -- consistency matters more than which format.

## Logging
- Structured logs (JSON format preferred)
- Include request ID in every log for traceability
- Levels: error (failures), warn (degraded), info (key events), debug (development)
- Never log sensitive data (passwords, tokens, PII)
- Use a logging library appropriate to the stack (Pino/Winston for Node, structlog for Python, Zap/Logrus for Go, etc.)

## Configuration
- Centralized config module that reads all env vars
- Validate required env vars on startup -- fail fast if missing
- Never import env vars directly in business logic

## Real-time communication (if applicable)
- WebSocket/SSE connections require authentication (validate token on connect)
- Event broadcast scoped by authorization (users only receive events they should see)
- Reconnection strategy handles token refresh and connection drops
- Connection limits and stale connection cleanup
- Multi-instance scaling via Redis pub/sub or equivalent

## Monitoring and observability
- Health check endpoint reports DB, queue, cache, and external service status (not just 200 OK)
- APM integration for latency tracing on key operations (Datadog, New Relic, Sentry, OpenTelemetry)
- Custom metrics: request latency percentiles, error rates by endpoint, queue depth, cache hit/miss ratios
- Alerting on error rate spikes, latency thresholds, and queue backlogs

## Testing
- Unit tests for services, utilities, and background jobs
- Integration tests for API endpoints, webhooks, and file handling (real or test database)
- Test scheduled tasks, real-time connections, and cache behavior where implemented
- Test file naming consistent with the project convention
- Mock external services in tests
- Coverage targets enforced in CI

## Deployment
- Dockerfile with multi-stage build and non-root user (if containerized)
- Health check endpoint required (`/api/health` or equivalent)
- CI pipeline must pass: lint, type-check (if applicable), test, build
- Secrets managed via environment variables or a secrets manager -- never committed

## Security
- Security headers middleware (Helmet for Express, SecurityMiddleware for Django, etc.)
- CORS restricted to known origins
- Rate limiting on auth and public endpoints
- Dependency audit clean -- no known critical/high vulnerabilities
- No secrets in code, ever
