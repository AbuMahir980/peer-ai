# Endpoint spec — template

Copy this file per endpoint or per **endpoint group** (related routes sharing resources). Remove unused sections. Link from tickets and PRs.

---

## Endpoint info

| Field | Value |
|--------|--------|
| **Method** | e.g. `GET`, `POST`, `PATCH`, `DELETE` |
| **Path** | e.g. `/v1/resources/:id` |
| **Description** | One sentence: what this does for the client. |
| **Auth required** | Yes / No |
| **Roles** | e.g. `admin`, `operator`, or `any authenticated` |
| **Idempotency** | For `POST`/`PATCH`: key header? safe retries? |
| **Related tickets** | e.g. ABC-123 |

---

## Request

### Headers

| Header | Required | Example / notes |
|--------|----------|-----------------|
| `Authorization` | Yes/No | `Bearer <access_token>` |
| `Content-Type` | Yes/No | `application/json` |
| `Idempotency-Key` | Yes/No | For safe retries on writes |

### Path parameters

| Name | Type | Description |
|------|------|-------------|
| | | |

### Query parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| | | | | |

### Body (JSON)

```typescript
// Types or example JSON
{
  // "field": "type — description"
}
```

**Validation rules:** (max length, enums, cross-field rules)

---

## Response

### Success

**Status:** `200` | `201` | `204` | …

```typescript
// Success body shape
{
}
```

### Errors (document common shapes)

| Status | When |
|--------|------|
| `400` | |
| `401` | |
| `403` | |
| `404` | |
| `409` | |
| `422` | Validation |
| `500` | Unexpected |

**Example error body:**

```json
{
  "error": {
    "code": "EXAMPLE_CODE",
    "message": "Safe client message",
    "details": {}
  }
}
```

---

## Service logic

Step-by-step business rules (order matters):

1. …
2. …
3. …

**Invariants / side effects:**

- …

**Out of scope (explicit):**

- …

---

## Database

### Tables

| Table | Access |
|-------|--------|
| | read / write / insert |

### Queries (describe intent)

- …

### Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| | | |

### Transactions

- Single-statement / multi-step transaction / none

---

## External calls

| Service | Purpose | Timeout | Retry policy |
|---------|---------|---------|--------------|
| e.g. IoT API | | e.g. 10s | e.g. 3x backoff on 429/5xx for GET only |
| e.g. Shopify | | | |

**Failure mapping:** (vendor error → app error code)

---

## Error scenarios

| Condition | Error code | HTTP status | Client message |
|-----------|------------|-------------|----------------|
| | | | |
| | | | |

---

## Notes

- Open questions: …
- Future versioning: …
- Links: OpenAPI operation id, design doc, etc.

---

## AI prompt — fill this template

```
Fill the following endpoint spec template from a natural language feature description.

Feature: [describe]
Auth model: [JWT roles]
Database: [Postgres + ORM name]

Use consistent error code naming (SCREAMING_SNAKE_CASE).
Mark unknowns as "TBD" with a short question.

Template sections to complete: Endpoint info, Request, Response, Service logic, Database, External calls, Error scenarios, Notes.

Feature description:
[paste]
```
