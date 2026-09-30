# Test strategy: {{Product}}

## Summary

{{How the product is tested today, in a few lines: what's covered, what isn't, and the most serious gap.}}

## What matters most

{{The journeys and rules that must never break, and why: money, people's data, safety, the product's main promise.}}

## Main journeys

{{Each main journey a person takes, with the end-to-end test that proves it, or "none yet", and each platform it must run on.}}

## Business rules

{{Each rule that must hold, such as a calculation, a limit or a change of state, with its test or "none yet", and the edges it must cover.}}

## Boundaries

{{Each outside service, database, store on a device or other part the code talks to, and how tests meet it: the real thing, a contract, or a stand-in, and why.}}

## Security and abuse

{{The abuse tests the product needs, such as another person's data, bad input and repeats, and what the threat model names; fuzzing and penetration tests where the stage calls for them.}}

## Rules this stage asks for

{{Each testing rule that applies at the product's stage, by id, ending in one of three things: the test that meets it, "gap below", or "planned: when, by whom" for a check that isn't a test in the code. Never an open question: what's unknown about the past goes under Open questions, and the plan stands.}}

## Test data

{{Where test data comes from, and how each test gets its own.}}

## Where tests run

{{What runs on every change and blocks a merge, what runs on a schedule, and how a flaky test is handled.}}

## Gaps

{{Each missing or weak test, most serious first: the test that would close it, described well enough to write (what it sets up, does and checks), its level, and the risk while it's missing.}}

## Open questions (optional)

{{What only a person can decide, with who can answer.}}
