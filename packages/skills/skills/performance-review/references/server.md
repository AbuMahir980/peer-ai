# The server

PERF-01 to PERF-04, SYS-02, API-07, API-08 and REL-01. Examples are from a made-up bicycle repair booking service.

## PERF-01: no query per row

- **Look at:** each `list-endpoint`, and what it loads for each row.
- **Pass:** related data loaded in a fixed number of queries, such as a join or one query for all the shops.
- **Fail:** a loop that queries for each booking's shop; an ORM field read in a template that loads lazily.

## PERF-02: queries are costed (production)

- **Look at:** each `query`'s filters and sorts, against the indexes in the migrations or schema.
- **Pass:** each filter and sort on a large table has an index.
- **Fail:** bookings looked up by shop with no index on the shop column. Before production, report it anyway when the table grows with use, and say the rule applies fully from production.

## PERF-03: caching is safe (production)

- **Look at:** each `cache`.
- **Pass:** it holds only what's expensive and harmless to be slightly stale, keyed so one person's data never reaches another.
- **Fail:** a cached price, permission or balance; a cache key without the user's id for a user's data.

## PERF-04: expensive endpoints are limited (production)

- **Look at:** searches, exports and reports.
- **Pass:** a rate limit or quota on each.

## SYS-02: nothing slow in a request

- **Look at:** each `slow-work`.
- **Pass:** it goes to a queue or a background job; the request returns without waiting.
- **Fail:** sending an email inside the request that books a repair.

## API-07 and API-08: lists are paged

- **Look at:** each `list-endpoint`.
- **Pass:** a page size and a way to get the next page, with the sizes set in one place.
- **Fail:** an endpoint that returns a shop's whole booking history in one response.

## REL-01: outside calls have a timeout

- **Look at:** each `outside` call.
- **Pass:** a timeout, and what happens when it's reached.
- **Fail:** a call with no timeout, which lets one slow service hold every request waiting on it.
