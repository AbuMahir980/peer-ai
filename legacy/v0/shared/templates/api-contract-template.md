<!--
  API Contract Template
  Recommended location: docs/04-api-contract.md (version-controlled in the repo)
  Suggested endpoint priority: [PLACEHOLDER: e.g. Auth → core resource → main write flow → secondary resources → remaining]
  The examples below use a neutral task-tracker domain. Replace every example with your own endpoints.
-->

# API Contract

<!-- Version this document with the API. Frontend and backend should agree before implementation. -->

| Field | Value |
|-------|-------|
| **API Name** | `[PLACEHOLDER: e.g. Task Tracker API]` |
| **Version** | `[PLACEHOLDER: e.g. v1]` |
| **Date** | `[PLACEHOLDER: YYYY-MM-DD]` |
| **Frontend Dev** | `[PLACEHOLDER]` |
| **Backend Dev** | `[PLACEHOLDER]` |

---

## Base URL & Auth

| Item | Value |
|------|-------|
| **Base URL** | `[PLACEHOLDER: e.g. https://api.example.com/api/v1]` |
| **Auth mechanism** | `[PLACEHOLDER: e.g. Bearer JWT, API key header, session cookie — or "None in v1; reserved for v2: Bearer JWT"]` |

---

## Standard Conventions

### Envelope format

_All successful responses follow this shape unless an endpoint states otherwise. List endpoints put their items and a `pagination` object inside `data`._

```json
{
  "success": true,
  "data": {},
  "message": "[PLACEHOLDER: optional human-readable message]",
  "timestamp": "[PLACEHOLDER: ISO-8601 UTC]"
}
```

### Date / time format

- **Wire format:** `[PLACEHOLDER: e.g. ISO-8601 with Z (2025-01-15T10:30:00Z); date-only fields as YYYY-MM-DD]`
- **Timezone:** `[PLACEHOLDER: e.g. UTC only; client displays in local TZ]`

### ID format

- **Resource IDs:** `[PLACEHOLDER: e.g. prefixed strings (task_01hzx8), UUID v4, or integers]`

### Naming convention

- **JSON keys:** `[PLACEHOLDER: e.g. camelCase]`
- **URL paths:** `[PLACEHOLDER: e.g. kebab-case, plural nouns]`

### Pagination

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | `1` | `[PLACEHOLDER: 1-based]` |
| `limit` | integer | `[PLACEHOLDER: e.g. 25]` | `[PLACEHOLDER: max, e.g. 100]` |

**Pagination in response** _(inside `data`, next to the list):_

```json
{
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Standard error codes

| HTTP | Code (body) | Meaning | When to use |
|------|-------------|---------|-------------|
| `400` | `[PLACEHOLDER: e.g. BAD_REQUEST]` | Malformed request | Unparseable body or params |
| `401` | `[PLACEHOLDER: e.g. UNAUTHORIZED]` | Not authenticated | Missing/invalid token |
| `403` | `[PLACEHOLDER: e.g. FORBIDDEN]` | Not allowed | Valid auth, insufficient permission |
| `404` | `[PLACEHOLDER: e.g. NOT_FOUND]` | Missing resource | Unknown ID |
| `409` | `[PLACEHOLDER: e.g. CONFLICT]` | Conflict | Duplicate or state conflict |
| `422` | `[PLACEHOLDER: e.g. VALIDATION_ERROR]` | Failed validation | Well-formed but invalid values |
| `429` | `[PLACEHOLDER: e.g. RATE_LIMITED]` | Too many requests | Throttling |
| `500` | `[PLACEHOLDER: e.g. INTERNAL_ERROR]` | Server error | Unexpected failure |

**Example error envelope:**

```json
{
  "success": false,
  "message": "[PLACEHOLDER: user-safe summary]",
  "code": "[PLACEHOLDER: machine code]",
  "details": {}
}
```

---

## Authentication Flow

_If this version has no auth, write "None in v1" here and list what is reserved for later._

1. `[PLACEHOLDER: e.g. Client obtains token from POST /auth/login]`
2. `[PLACEHOLDER: e.g. Client sends Authorization: Bearer <token> on each request]`
3. `[PLACEHOLDER: e.g. On 401, call POST /auth/refresh; if that fails, redirect to login]`
4. `[PLACEHOLDER: optional — logout / revoke]`

---

## Endpoints

_Repeat the block below for each endpoint. Remove unused param sections. The three examples cover a paginated list, a create with a conflict case, and a date-range report._

---

### `GET` `/tasks`

**Description:** Lists tasks visible to the caller, newest first, with optional filters.

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer [TOKEN]` |
| `Accept` | No | `application/json` |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | `open`, `inProgress`, or `done` |
| `assigneeId` | string | No | Filter by assignee |
| `search` | string | No | Matches title and description |
| `page` | integer | No | Page number (default `1`) |
| `limit` | integer | No | Page size (default `25`, max `100`) |

**Path parameters** — _N/A_

**Request body** — _N/A_

**Success response** `200` — `application/json`

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_01hzx8",
        "projectId": "proj_4k2m",
        "title": "Send March invoice",
        "status": "open",
        "dueDate": "2025-01-31",
        "assignee": { "id": "user_7f3a", "name": "Sam Lee" },
        "commentCount": 2,
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-16T08:12:45Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 142,
      "totalPages": 6,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "timestamp": "2025-01-16T09:00:00Z"
}
```

**Error response** `401` — `application/json`

```json
{
  "success": false,
  "message": "Invalid or expired token",
  "code": "UNAUTHORIZED",
  "details": {}
}
```

**Notes**

- `[PLACEHOLDER: e.g. dueDate is a date-only string; assignee is null for unassigned tasks.]`
- `[PLACEHOLDER: e.g. Results are scoped to projects the caller belongs to.]`

---

### `POST` `/projects/{projectId}/tasks`

**Description:** Creates a task in a project.

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer [TOKEN]` |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No | `[PLACEHOLDER: UUID for safe retries]` |

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `projectId` | string | Project the task belongs to |

**Query parameters** — _N/A_

**Request body** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | 1–200 characters |
| `description` | string | No | Markdown allowed |
| `dueDate` | string (date) | No | `YYYY-MM-DD` |
| `assigneeId` | string | No | Must be a project member |

```json
{
  "title": "Send March invoice",
  "dueDate": "2025-01-31",
  "assigneeId": "user_7f3a"
}
```

**Success response** `201` — `application/json`

```json
{
  "success": true,
  "data": {
    "id": "task_01hzx8",
    "projectId": "proj_4k2m",
    "title": "Send March invoice",
    "status": "open",
    "dueDate": "2025-01-31",
    "assignee": { "id": "user_7f3a", "name": "Sam Lee" },
    "commentCount": 0,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Error response** `409` — `application/json`

```json
{
  "success": false,
  "message": "A task with this title already exists in the project",
  "code": "CONFLICT",
  "details": {
    "existingTaskId": "task_01hzx7"
  }
}
```

**Error response** `422` — `application/json`

```json
{
  "success": false,
  "message": "Request failed validation",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": { "title": "must be between 1 and 200 characters" }
  }
}
```

**Notes**

- `[PLACEHOLDER: e.g. Creating a task notifies the assignee asynchronously.]`

---

### `GET` `/reports/completed-tasks`

**Description:** Returns counts of completed and overdue tasks per period, for charts and exports.

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer [TOKEN]` |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | string (date) | Yes | Start date `YYYY-MM-DD` |
| `end` | string (date) | Yes | End date `YYYY-MM-DD` |
| `groupBy` | string | No | `day`, `week`, or `month` (default `day`) |
| `projectId` | string | No | Limit to one project |

**Path parameters** — _N/A_

**Request body** — _N/A_

**Success response** `200` — `application/json`

```json
{
  "success": true,
  "data": {
    "periods": [
      {
        "period": "2025-01-14",
        "periodStart": "2025-01-14T00:00:00Z",
        "periodEnd": "2025-01-14T23:59:59Z",
        "completedCount": 12,
        "overdueCount": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  },
  "timestamp": "2025-01-16T09:00:00Z"
}
```

**Error response** `400` — `application/json`

```json
{
  "success": false,
  "message": "start must be before end",
  "code": "BAD_REQUEST",
  "details": {
    "fields": ["start", "end"]
  }
}
```

**Notes**

- `[PLACEHOLDER: e.g. Ranges over 90 days may be slow; consider an async export.]`

---

## Changelog

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| `[PLACEHOLDER: e.g. 0.1.0]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | Initial draft |
| `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER: e.g. Added status filter to GET /tasks]` |
