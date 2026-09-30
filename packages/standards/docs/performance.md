# Performance and caching

Knowing what things cost, and caching only what's safe to cache.

## PERF-01 · No list runs one query per row

A list loads its related data in a fixed number of queries, never one extra query for each row.

**Why:** One query per row passes every test on sample data and falls over on real data.

**Ask:** Does any list in this change run a query for each of its rows?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## PERF-02 · A query's cost is known before it ships

Before a query ships, someone knows what it costs: filters and sorts use indexes, joins are few, and maths done per request on large data is watched.

**Why:** A slow query is invisible with little data and becomes an outage as the data grows.

**Ask:** Is every new query in this change backed by the indexes it needs?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## PERF-03 · Cache only what's safe to be wrong about

Cache only what's expensive to work out and cheap to get wrong. Never cache a decision about money, safety or permissions, and never cache one person's data where another could be served it.

**Why:** A stale or shared cache entry can show one person another's data, or approve what's no longer allowed.

**Ask:** Does anything in this change cache a sensitive decision, or one person's data where another could see it?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | High | Always | [OWASP ASVS 5.0, 14.2.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md) |

## PERF-04 · Expensive endpoints are rate limited too

Endpoints that are cheap to call but expensive to serve, such as searches and exports, are rate limited, not just sign-in.

**Why:** Cheap to ask for and expensive to answer is the shape of a denial-of-service attack.

**Ask:** Is every expensive endpoint in this change rate limited?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | [OWASP ASVS 5.0, 2.4.1, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x11-V2-Validation-and-Business-Logic.md) |

## PERF-05 · Long lists draw only what's on screen

A list that can grow long draws only the items on screen, loading and releasing the rest as the person scrolls.

**Why:** Drawing thousands of items at once freezes a phone and drains its battery.

**Ask:** Does any list in this change draw every item at once when it could grow long?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## PERF-06 · What's started is stopped

Timers, subscriptions, listeners and object URLs are released when the screen or component that created them goes away.

**Why:** Anything left running keeps using memory, battery and network, and often keeps acting on a screen nobody can see.

**Ask:** Does everything this change starts get stopped or released when it's no longer needed?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## PERF-07 · Images are resized before they're stored or sent

Photos and large images are resized to what the product actually shows before they're stored or uploaded.

**Why:** A full-size camera photo is often several megabytes, and a few hundred of them fill a device's storage or a person's data plan.

**Ask:** Does this change store or send images larger than the product shows?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |
