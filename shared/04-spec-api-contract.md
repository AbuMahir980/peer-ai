# 04 — API Contract

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — API contracts require cross-cutting reasoning across FE, BE, and external APIs. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in the model picker (bottom-left of the chat panel). API contract design needs the deepest reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

---

## How this works

The API contract defines how frontend and backend communicate. This single file handles **every scenario** — whether you're the frontend developer defining what you need, the backend developer defining what you can provide, or someone working with an existing external API. The AI adapts based on your role.

---

## Step 1: Determine who you are and what you have

Ask the user:

> "Let's define the API contract. First, tell me:
>
> **What's your role?**
> 1. I'm the **frontend developer** — I need to define what data and endpoints the UI requires
> 2. I'm the **backend developer** — I need to define what endpoints I'll build (or I've received requirements from the frontend)
>
> **What do you have already?**
> A. Nothing yet — I'm starting from the system spec
> B. I have API requirements from the other side (frontend sent me their needs, or backend sent me their API docs)
> C. I have an external API contract (like a third-party IoT API or Shopify API) that I need to work with
> D. Both — I have some external APIs and need additional custom endpoints"

**Wait for the user's input.**

---

## Step 2: Build the requirements based on role

### If frontend developer (role 1):

Read `docs/03-system-spec.md`. Go through the spec page by page / feature by feature:

> "Let's figure out what the UI needs from the backend. I'll go feature by feature from the system spec."

For each feature/page, ask:
- What data does this page display? (every field)
- What actions can the user take? (create, update, delete, filter, search, export)
- What happens after each action? (what response does the UI expect?)
- Is any data real-time? (live updates, polling)

Compile into an endpoint requirements list:

| What the UI needs | Suggested endpoint | Key request params | Response fields needed |
|-------------------|-------------------|-------------------|----------------------|
| List customers with search | GET /api/v1/customers | search, page, limit, status | id, name, email, phone, status, unitsCount |
| Customer detail | GET /api/v1/customers/:id | — | id, name, email, phone, address, units[], subscription |

> "Here's what the frontend needs. Review this — anything missing or unnecessary?"

**Wait for the user's input.**

If the user also has an **existing external API** (option C/D), ask them to share it:

> "You mentioned you have an existing API. Paste or describe it, and I'll map it against what the UI needs — I'll show you what's covered, what's partial, and what's missing."

Create a mapping:

| UI need | Existing API endpoint | Match | Gap |
|---------|----------------------|:-----:|-----|
| Unit telemetry | GET /iot/units/:snr/data | ✅ Full | None |
| Unit command | POST /iot/units/:snr/cmd | ⚠️ Partial | Missing error responses |
| Customer list | — | ❌ Missing | Need from backend team |

> "The existing API covers some needs. The gaps need custom endpoints from the backend developer. Let's define those now."

**Wait for the user's input.** Define the custom endpoints needed for the gaps.

### If backend developer (role 2):

**If they have frontend requirements (option B):**

> "Paste or describe the API requirements the frontend sent you. I'll review each endpoint and assess feasibility."

For each endpoint, evaluate:

| Endpoint | Can you provide it? | Effort | Concerns |
|----------|:---:|:---:|---------|
| GET /customers?search=X | ✅ Yes | Medium | Full-text search needs an index |
| GET /units/:snr/telemetry | ⚠️ Partial | High | Data comes from IoT API, need to proxy and cache |
| POST /units/:snr/command | ❌ Blocked | — | No write access to IoT API |

> "Here's my assessment. Green is straightforward, yellow is doable with caveats, red is blocked. Let's discuss the yellows and reds — what should we do about each?"

**Wait for the user's input.** For blocked items, discuss alternatives (defer, use a different data source, request access from third party).

**If starting from scratch (option A):**

Read `docs/03-system-spec.md` and extract all endpoints needed, grouped by domain (Auth, Customers, Units, etc.). Present them and ask the user to review.

> "Here's every endpoint I've extracted from the spec. Review it — are there endpoints missing? Any where the data source is unclear?"

**Wait for the user's input.**

For each endpoint, also ask about the data source:

| Endpoint | Data source | Owns the data? |
|----------|------------|:-:|
| GET /customers | PostgreSQL | ✅ Yes |
| GET /units/:snr/telemetry | IoT Cloud API | ❌ No (proxy) |
| GET /customers/:id/subscription | Shopify API | ❌ No (proxy) |

> "Some endpoints serve data you own, some proxy external services. The external ones need caching and error handling for when the third-party is down. Should we discuss the integration strategy?"

**Wait for the user's input.**

---

## Step 3: Define standard conventions

These apply regardless of role. Present defaults and ask:

**Response envelope (success):**
```json
{
  "success": true,
  "data": {},
  "message": "optional human-readable message",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Response envelope (error):**
```json
{
  "success": false,
  "message": "user-safe error summary",
  "code": "MACHINE_ERROR_CODE",
  "details": {}
}
```

Present both formats and explain: the `success` field lets the client quickly check if the request worked; `data` carries the payload on success; `code` and `details` carry structured error info on failure. This matches the API contract template.

If the user prefers a different envelope (e.g. `data/error/meta` with `requestId`), adapt to their preference -- the key is that the whole project uses one format consistently.

**Conventions to confirm:**
- Date format → ISO 8601 (`2025-01-15T10:30:00Z`)
- ID format → prefixed strings (`cust_abc123`) or UUIDs?
- Field naming → camelCase in JSON?
- Pagination → offset-based (`page`, `limit`) or cursor-based?
- Auth header → `Authorization: Bearer <token>`
- Error codes → string enum (`AUTH_TOKEN_EXPIRED`, `RESOURCE_NOT_FOUND`, etc.)

> "Here are the standard conventions including the response envelope format. Do these work, or does the backend already use different patterns that we should match? The envelope format especially should be agreed by both frontend and backend before anyone starts building."

**Wait for the user's input.**

---

## Step 4: Define the authentication flow

Walk through step by step:

1. User submits credentials to POST /api/v1/auth/login
2. Backend returns access token + refresh token + user object
3. Frontend stores access token in memory, refresh token in httpOnly cookie
4. All requests include `Authorization: Bearer <accessToken>`
5. On 401 response → call POST /api/v1/auth/refresh
6. If refresh fails → redirect to login

> "Here's the auth flow. Does this match what the auth system uses? Any changes?"

**Wait for the user's input.**

---

## Step 5: Define response shapes endpoint by endpoint

For each endpoint, define the exact JSON:

```json
// GET /api/v1/customers?search=john&page=1&limit=25
{
  "data": {
    "customers": [
      {
        "id": "cust_abc123",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+27821234567",
        "status": "active",
        "unitsCount": 2,
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 142
    }
  }
}
```

Work through each endpoint or endpoint group. After each:

> "These are the exact fields and types for this endpoint. Anything to add, rename, or remove?"

**Wait for the user's input.**

---

## Step 6: Define error responses

Standard error table:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| AUTH_TOKEN_EXPIRED | 401 | JWT has expired |
| AUTH_INVALID_TOKEN | 401 | JWT is malformed |
| AUTH_FORBIDDEN | 403 | User lacks permission |
| RESOURCE_NOT_FOUND | 404 | Entity doesn't exist |
| VALIDATION_ERROR | 422 | Request failed validation |
| INTERNAL_ERROR | 500 | Unhandled server error |

> "These are the standard error codes. Any domain-specific ones needed? For example, 'UNIT_OFFLINE' when a power unit can't be reached?"

**Wait for the user's input.**

---

## Step 7: Optional OpenAPI spec generation

Ask:

> "The API contract is ready as a markdown document. Would you also like me to generate an **OpenAPI 3.x (YAML/JSON) spec** from this contract? Benefits:
>
> - **Auto-generated API docs** (Swagger UI, Redoc)
> - **Client SDK generation** (TypeScript, Python, etc.) from the spec
> - **Machine-validated contract tests** (compare actual responses to the schema)
> - **Mock server** generation for frontend development
>
> This is optional — the markdown contract works on its own. But OpenAPI adds rigor as the API grows."

**Wait for the user's input.**

If yes: generate an `openapi.yaml` (or `openapi.json`) file in the `docs/` folder that mirrors the markdown contract exactly — same endpoints, same request/response shapes, same error codes. Confirm the output is valid by briefly reviewing it with the user.

If no: proceed without it. The markdown contract is the source of truth.

---

## Step 8: Save and coordinate

Compile the full contract: conventions, auth flow, error codes, every endpoint with exact JSON shapes.

Save as `docs/04-api-contract.md` (and `docs/openapi.yaml` if the user opted for OpenAPI in the previous step).

**API Contracts v1 placement:** The recommended location for the canonical API contract is `docs/api-contracts-v1.md` in the GitHub repository — version-controlled alongside the code and visible to everyone in Cursor. If the team uses a shared Linear document instead, ensure the markdown version stays in sync.

**Suggested endpoint priority order** (unblock frontend development in parallel):
1. Auth + sessions (login, token refresh, role in token payload)
2. Customer model (search, list, detail, linked units)
3. Support cases (CRUD, queue, assignment, status transitions)
4. Notes and timeline (create, list per customer/case/unit)
5. Remote actions, config, and remaining endpoints

Then tell the user:

> "The API contract is saved to `docs/04-api-contract.md`. Here's what happens next:
>
> **If you're the frontend developer:**
> Send this contract to the backend developer for review. They need to confirm they can provide these endpoints in these shapes. If they have concerns, you'll negotiate and update this document together.
> Then continue to `.workflow/shared/05-rules-shared.md` to establish coding standards.
>
> **If you're the backend developer:**
> Send this to the frontend developer for review. They need to confirm these shapes give them what the UI needs.
> Then continue to `.workflow/shared/05-rules-shared.md` to establish coding standards.
>
> **Important:** Neither side should start building until both have agreed on this contract. It's much cheaper to fix a disagreement here than after code is written."

### PDF-ready export

After saving the markdown, offer:

> "Want me to generate a PDF-ready HTML version of the API contract in `docs-pdf/`? You can open it in a browser and print/save as PDF — useful for sharing with the other developer or stakeholders."

**Wait for the user's input.** If yes, tell the user: "Switch to **Composer 2** for the HTML export — it's pure templating work and much cheaper. Let me know when you've switched." Wait for confirmation, then generate `docs-pdf/04-api-contract.html` following the styling rules in `.workflow/shared/cursor-rules/docs-pdf-export.mdc`. Ensure `docs-pdf/` is gitignored. After the export, remind the user to switch back to the previous model. If no, move on.

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're helping define the boundary between two systems. Surface friction early — mismatched field names, data the backend can't efficiently provide, fields the frontend doesn't actually need. Ask "does the frontend really need this nested object, or would a flat response with an ID reference work?" These are the conversations that prevent integration headaches.
