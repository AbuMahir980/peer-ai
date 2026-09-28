---
"@peer-ai/workflow": minor
"peer-ai": minor
---

Reviews now show their work (RFC 0002). A review writes a report: what it looked at, what it read first, every rule it checked and how each went, and every problem it found, with file, line, evidence and one of four severity levels. `record_review` checks the report and works out pass, fail or incomplete from it, refusing a result the report doesn't support. A review recorded without a report is marked unproven: allowed for a prototype, a warning for an MVP, and a failure in production. Open problems at or above `gates.blockOn` stop a work item from shipping.
