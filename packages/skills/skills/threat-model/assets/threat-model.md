# Threat model: {{product}}

## Summary

{{What the product is, the few threats that matter most, and how many defences are missing.}}

## What we're working on

{{The parts, where they run and who uses them. What's worth protecting: personal data, money, accounts, secrets and the service staying up, with what's especially sensitive marked.}}

## Ways in

| Way in | Kind | Who can reach it | Where |
|--------|------|------------------|-------|
| {{POST /orders}} | {{route}} | {{Signed-in customers}} | {{The file}} |

## Trust boundaries

{{Where data crosses from less trusted to more trusted: the browser or app to the API, the API to the database, the product to an outside service, a model's output to an action.}}

## What can go wrong

| Id | Way in | Threat | Kind | Impact | What stops it | Status |
|----|--------|--------|------|--------|---------------|--------|
| {{T1}} | {{The way in}} | {{What happens, and who is harmed}} | {{Spoofing, tampering, repudiation, disclosure, denial of service or elevation}} | {{Critical, high, medium or low}} | {{The rule, and the file and line where it holds}} | {{In place, missing, planned, accepted or not checked}} |

## What we'll do about it

{{Each missing defence as work to do, most serious first, with the rule it meets.}}

## Accepted risks (optional)

{{Each risk a person chose to live with: who decided, why, and until when.}}

## Assumptions

{{What this model takes as given, such as who can reach the product and where it runs, and what changes if it's wrong.}}

## Open questions

{{Each question only a person can answer, and who can answer it.}}

## When to update

{{The changes that mean this model must be updated (SEC-25): a new route, upload, webhook, sign-in method, live connection, outside service or AI feature.}}

## Sources

{{What this was written from: the code at a commit, the requirements, the architecture and the people asked, with dates. When updating, what changed and why.}}
