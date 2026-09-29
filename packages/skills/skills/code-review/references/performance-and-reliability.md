# Outside calls, load and leaks

REL-01, BE-02, PERF-01, PERF-05 and PERF-06.

## REL-01: every outside call has a timeout and handles failure

For every call to another service or API, including the project's own API from an app, check two things:

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
