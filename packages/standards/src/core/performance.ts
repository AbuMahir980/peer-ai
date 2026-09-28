import type { RuleInput } from "../rule.ts";

// Knowing what things cost, and caching only what's safe to cache.

const ASVS = "OWASP ASVS 5.0";
const V2 = "https://github.com/OWASP/ASVS/blob/master/5.0/en/0x11-V2-Validation-and-Business-Logic.md";
const V14 = "https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md";

export const performance = [
  {
    id: "PERF-01",
    domain: "performance",
    title: "No list runs one query per row",
    rule: "A list loads its related data in a fixed number of queries, never one extra query for each row.",
    why: "One query per row passes every test on sample data and falls over on real data.",
    ask: "Does any list in this change run a query for each of its rows?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
  {
    id: "PERF-02",
    domain: "performance",
    title: "A query's cost is known before it ships",
    rule: "Before a query ships, someone knows what it costs: filters and sorts use indexes, joins are few, and maths done per request on large data is watched.",
    why: "A slow query is invisible with little data and becomes an outage as the data grows.",
    ask: "Is every new query in this change backed by the indexes it needs?",
    stage: "production",
    check: "ai-review",
    severity: "medium",
  },
  {
    id: "PERF-03",
    domain: "performance",
    title: "Cache only what's safe to be wrong about",
    rule: "Cache only what's expensive to work out and cheap to get wrong. Never cache a decision about money, safety or permissions, and never cache one person's data where another could be served it.",
    why: "A stale or shared cache entry can show one person another's data, or approve what's no longer allowed.",
    ask: "Does anything in this change cache a sensitive decision, or one person's data where another could see it?",
    stage: "production",
    check: "ai-review",
    severity: "high",
    sources: [{ name: ASVS, ref: "14.2.2, level 2", url: V14 }],
  },
  {
    id: "PERF-04",
    domain: "performance",
    title: "Expensive endpoints are rate limited too",
    rule: "Endpoints that are cheap to call but expensive to serve, such as searches and exports, are rate limited, not just sign-in.",
    why: "Cheap to ask for and expensive to answer is the shape of a denial-of-service attack.",
    ask: "Is every expensive endpoint in this change rate limited?",
    stage: "production",
    check: "ai-review",
    severity: "medium",
    sources: [{ name: ASVS, ref: "2.4.1, level 2", url: V2 }],
  },
  {
    id: "PERF-05",
    domain: "performance",
    title: "Long lists draw only what's on screen",
    rule: "A list that can grow long draws only the items on screen, loading and releasing the rest as the person scrolls.",
    why: "Drawing thousands of items at once freezes a phone and drains its battery.",
    ask: "Does any list in this change draw every item at once when it could grow long?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
  {
    id: "PERF-06",
    domain: "performance",
    title: "What's started is stopped",
    rule: "Timers, subscriptions, listeners and object URLs are released when the screen or component that created them goes away.",
    why: "Anything left running keeps using memory, battery and network, and often keeps acting on a screen nobody can see.",
    ask: "Does everything this change starts get stopped or released when it's no longer needed?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
  {
    id: "PERF-07",
    domain: "performance",
    title: "Images are resized before they're stored or sent",
    rule: "Photos and large images are resized to what the product actually shows before they're stored or uploaded.",
    why: "A full-size camera photo is often several megabytes, and a few hundred of them fill a device's storage or a person's data plan.",
    ask: "Does this change store or send images larger than the product shows?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
] satisfies RuleInput[];
