# Limits and tests

AI-07, AI-08 and REL-01.

## AI-07: AI calls have limits

For each `model-call`, check three limits:

- a timeout;
- a limit on how much is sent and returned, such as a maximum number of tokens;
- a limit on how much each person can use.

**Fail** when any is missing. A limit set in another repository or at the provider's console is `not-checked`, with where it would be.

## REL-01: an outside call handles failure

**Fail** when a failed or slow response from the model provider isn't handled, such as a status never checked or an error that crashes the request.

## AI-08: fixed examples, attacks included

**Pass** when the feature has a set of example inputs with the behaviour expected for each, including attacks such as prompt injection and attempts to make it leak data or overstep its permissions, and they run when its instructions or model change.

**Fail** when there are no such examples, or none of them is an attack.
