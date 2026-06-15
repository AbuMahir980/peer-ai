<!-- 
  API Contract Template
  Recommended location: docs/api-contracts-v1.md (version-controlled in the repo)
  Suggested endpoint priority: Auth → Customers → Cases → Notes → remaining
-->

# API Contract

<!-- Version this document with the API. Frontend and backend should agree before implementation. -->

| Field | Value |
|-------|-------|
| **API Name** | `[PLACEHOLDER: e.g. Fleet Telemetry API]` |
| **Version** | `[PLACEHOLDER: e.g. v3]` |
| **Date** | `[PLACEHOLDER: YYYY-MM-DD]` |
| **Frontend Dev** | `[PLACEHOLDER]` |
| **Backend Dev** | `[PLACEHOLDER]` |

---

## Base URL & Auth

| Item | Value |
|------|-------|
| **Base URL** | `[PLACEHOLDER: e.g. https://api.example.com]` |
| **Auth mechanism** | `[PLACEHOLDER: e.g. Bearer JWT, API key header, session cookie]` |

---

## Standard Conventions

### Envelope format

_All successful list/detail responses follow this shape unless an endpoint states otherwise._

```json
{
  "success": true,
  "data": {},
  "message": "[PLACEHOLDER: optional human-readable message]",
  "timestamp": "[PLACEHOLDER: ISO-8601 UTC]"
}
```

### Date / time format

- **Wire format:** `[PLACEHOLDER: e.g. ISO-8601 with Z, or YYYY-MM-DD HH:mm:ss UTC]`
- **Timezone:** `[PLACEHOLDER: e.g. UTC only; client displays in local TZ]`

### ID format

- **Resource IDs:** `[PLACEHOLDER: e.g. integer SNR, UUID v4]`

### Naming convention

- **JSON keys:** `[PLACEHOLDER: e.g. snake_case, camelCase]`
- **URL paths:** `[PLACEHOLDER: e.g. kebab-case, plural nouns]`

### Pagination

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `[PLACEHOLDER: e.g. page]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` |
| `[PLACEHOLDER: e.g. limit]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER: max]` |

**Pagination in response** _(if applicable):_

```json
{
  "pagination": {
    "current_page": 1,
    "per_page": 100,
    "total_records": 0,
    "total_pages": 0,
    "has_next": false,
    "next_page": null,
    "has_previous": false,
    "previous_page": null
  }
}
```

### Standard error codes

| HTTP | Code (body) | Meaning | When to use |
|------|-------------|---------|-------------|
| `400` | `[PLACEHOLDER: e.g. VALIDATION_ERROR]` | Bad request | Invalid params / body |
| `401` | `[PLACEHOLDER: e.g. UNAUTHORIZED]` | Not authenticated | Missing/invalid token |
| `403` | `[PLACEHOLDER: e.g. FORBIDDEN]` | Not allowed | Valid auth, insufficient permission |
| `404` | `[PLACEHOLDER: e.g. NOT_FOUND]` | Missing resource | Unknown ID |
| `409` | `[PLACEHOLDER: e.g. CONFLICT]` | Conflict | Duplicate or state conflict |
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

1. `[PLACEHOLDER: e.g. Client obtains token from …]`
2. `[PLACEHOLDER: e.g. Client sends Authorization: Bearer <token> on each request]`
3. `[PLACEHOLDER: e.g. Token refresh or expiry handling]`
4. `[PLACEHOLDER: optional — logout / revoke]`

---

## Endpoints

_Repeat the block below for each endpoint. Remove unused param sections._

---

### `GET` `/api/v1/fleet/status`

**Description:** Returns the latest telemetry snapshot per battery in the fleet.

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer [TOKEN]` |
| `Accept` | No | `application/json` |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `snr` | string (CSV) | No | Filter by serial numbers, e.g. `100,101` |
| `page` | integer | No | Page number (default `1`) |
| `limit` | integer | No | Page size (default `100`, max `1000`) |

**Path parameters** — _N/A_

**Request body** — _N/A_

**Success response** `200` — `application/json`

```json
{
  "success": true,
  "data": [
    {
      "SNR": 1027,
      "timestamp": "2026-03-25 14:30:00",
      "soc_user": 78,
      "temp": 32.5,
      "LED": "GREEN"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 100,
    "total_records": 42,
    "total_pages": 1,
    "has_next": false,
    "next_page": null,
    "has_previous": false,
    "previous_page": null
  },
  "count": 42,
  "timestamp": "2026-03-25T14:35:00Z"
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

- `[PLACEHOLDER: e.g. Timestamps are UTC without offset; clients must parse accordingly.]`
- `[PLACEHOLDER: Nullable numeric fields when sensor missing.]`

---

### `POST` `/api/v1/devices/{deviceId}/commands`

**Description:** Queues a remote command for a single device (e.g. refresh config).

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer [TOKEN]` |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No | `[PLACEHOLDER: UUID for safe retries]` |

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `deviceId` | string | Unique device identifier |

**Query parameters** — _N/A_

**Request body** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command` | string | Yes | e.g. `REFRESH_CONFIG` |
| `payload` | object | No | Command-specific parameters |

```json
{
  "command": "REFRESH_CONFIG",
  "payload": {
    "force": false
  }
}
```

**Success response** `202` — `application/json`

```json
{
  "success": true,
  "data": {
    "commandId": "cmd_01jqxyzexample",
    "deviceId": "dev_8f3a2b1c",
    "status": "QUEUED",
    "queuedAt": "2026-03-25T14:40:00Z"
  }
}
```

**Error response** `409` — `application/json`

```json
{
  "success": false,
  "message": "Device already has a pending command of this type",
  "code": "COMMAND_CONFLICT",
  "details": {
    "pendingCommandId": "cmd_01jqprev123"
  }
}
```

**Notes**

- `[PLACEHOLDER: Command delivery is async; poll GET /commands/{commandId} or use webhooks.]`

---

### `GET` `/api/v1/reports/energy`

**Description:** Returns aggregated energy totals per period for charting and exports.

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer [TOKEN]` |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | string (date) | Yes | Start date `YYYY-MM-DD` |
| `end` | string (date) | Yes | End date `YYYY-MM-DD` |
| `aggregate` | string | No | `hour`, `day`, `week`, `month` (default `day`) |
| `snr` | string (CSV) | No | Limit to specific batteries |

**Path parameters** — _N/A_

**Request body** — _N/A_

**Success response** `200` — `application/json`

```json
{
  "success": true,
  "data": [
    {
      "SNR": 1027,
      "period": "2026-03-24",
      "period_start": "2026-03-24T00:00:00Z",
      "period_end": "2026-03-24T23:59:59Z",
      "Wh_inv_total": 1250.5,
      "Wh_grid_total": 800.0,
      "Wh_solar_total": 420.25,
      "record_count": 288
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 100,
    "total_records": 1,
    "total_pages": 1,
    "has_next": false,
    "next_page": null,
    "has_previous": false,
    "previous_page": null
  }
}
```

**Error response** `400` — `application/json`

```json
{
  "success": false,
  "message": "start must be before end",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": ["start", "end"]
  }
}
```

**Notes**

- `[PLACEHOLDER: Large ranges may be slow; consider async export for > 90 days.]`

---

## Changelog

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| `[PLACEHOLDER: e.g. 0.1.0]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | Initial draft |
| `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER: e.g. Added snr filter to /fleet/status]` |
