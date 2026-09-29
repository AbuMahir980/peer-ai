# Architecture: {{product}}

## Summary

{{How the product is built, in a short paragraph: its parts, how they talk, and where data lives.}}

## Needs it answers

{{The needs that shape it, from the requirements: who uses it and how, how many people and how much data, where it operates and which laws apply, and how available it must be. Say which part of the design each one drives.}}

## Parts

| Part | What it owns | Where | Runs on |
|------|--------------|-------|---------|
| {{The part}} | {{Its area of the business and its data}} | {{Its folder or repository}} | {{Where it runs}} |

## How the parts depend on each other

{{Which parts and modules may call or import which, in which direction, and what may never happen, such as one feature importing another. Concrete enough for a reviewer to check.}}

## Data

{{Each store, the part that owns it, and the one way code reaches it. Where the database's structure comes from. What's especially sensitive, and where it's kept.}}

## Contracts

{{Each agreed interface between parts or with the outside, and its one source of truth, such as an API contract file.}}

## Outside services

{{Each outside service, what the product sends it, and what happens when it's down.}}

## Where it runs

{{Where each part runs, the environments, and how changes reach production.}}

## Decisions

{{Each significant decision, with its status and a link to its record in docs/decisions/.}}

## Risks

{{Where the code breaks this architecture today, and what could make it fail, most serious first.}}

## Open questions

{{Each question only a person can answer, and who can answer it.}}

## Sources

{{What this was written from: the requirements, the code at a commit, and the people asked, with dates. When updating, what changed and why.}}
