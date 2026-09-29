---
"@peer-ai/skills": minor
---

Add the contract-check skill. It lists every route twice, from the contract and from the code, and compares them both ways: paths, who may call each route, request and response fields and their case, status codes, the error shape and paging. A route on one side only is a finding, and so is a response that returns more than the contract promises, most of all personal data or card details. The contract is the source of truth, so the report says which side should change, and never changes the contract to match a bug.
