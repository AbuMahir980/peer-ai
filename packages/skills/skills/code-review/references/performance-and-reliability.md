# Outside calls, updates, load and leaks

REL-01, REL-09, BE-02, PERF-01, PERF-05 and PERF-06.

## REL-01: every outside call has a timeout and handles failure

For every `call` item, including the project's own API from an app and an AI model, check two things:

- it sets a timeout;
- it checks for a failed response before using the body.

**Fail** on:

- a call with no timeout;
- a `fetch` or HTTP call whose status is never checked;
- a retry on something that isn't safe to repeat.

## BE-02: request bodies have a size limit

**Fail** when an endpoint accepts a body with no size limit, or one far larger than it needs.

## PERF-01: no list runs one query per row

**Fail** when a list loads each row's related data with its own query, in a loop or through lazy loading. **Pass** when the related data comes in a fixed number of queries.

**Fail** too when an endpoint returns a whole table at once. That also breaks API-07.

## PERF-05: long lists draw only what's on screen

**Fail** when a list that can grow long draws every item at once instead of only those on screen.

## PERF-06: what's started is stopped

**Fail** when any of these outlives the screen or component that created it:

- a timer;
- an interval;
- a subscription;
- an event listener;
- an object URL.

**Pass** when each is released in the component's cleanup.

## REL-09: an app that caches itself still updates

For each service worker or app cache, in an app that works offline:

**Pass** when the cache is versioned, and the app checks for a new version and applies it, or tells the person.

**Fail** on a cache that serves its first copy forever, so nobody gets a fix.
