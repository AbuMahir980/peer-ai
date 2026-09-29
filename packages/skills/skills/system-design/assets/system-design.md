# Design: {{feature}}

## Summary

{{What's built and how, in a short paragraph, with a link to the product spec.}}

## What changes

| Part | What changes | Where |
|------|--------------|-------|
| {{The part or module}} | {{What it gains or loses}} | {{Its files}} |

## Flow

{{Each journey from the spec, step by step: who calls what, where the permission is checked, what's read and written, and what's returned.}}

## Data

{{Each table, field or store added or changed, its migration, and how existing data is kept. What's locked, and which database guarantees are used. For a part in another repository, the guarantees to request from its owners instead.}}

## API

{{Each endpoint or message added or changed, the contract change, and how existing clients keep working.}}

## Two at once and done twice

{{What happens when two people or devices act on the same record together, and when a request, a tap or a job happens twice.}}

## Failures

{{Each outside call: its timeout, what happens when it fails or hangs, and what the person sees.}}

## Performance

{{How many queries each request makes, how lists are paged, and what runs off the request.}}

## Security

{{Where each permission is checked, and for which record; what input is validated; which secrets are used and where they're kept.}}

## Tests

{{The tests that prove it: each acceptance criterion, the hard cases, and attacks such as another person's id.}}

## Rollout (optional)

{{The order to ship the changes in, any switch to turn the feature on, and how to undo it.}}

## Open questions

{{Each decision only a person can make, the option recommended until they do, and who can decide.}}

## Sources

{{What this was written from: the spec, the architecture, the contract, the code at a commit, and the people asked.}}
