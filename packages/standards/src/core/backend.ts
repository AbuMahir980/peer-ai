import type { RuleInput } from "../rule.ts";

// How servers take requests and report what happened, whatever the language or framework.

export const backend = [
  {
    id: "BE-01",
    domain: "backend",
    title: "A failed operation is reported as failed",
    rule: "An operation that didn't happen is never reported as done: a payment that didn't go through is never shown as sent.",
    why: "A false success is worse than an error. The person relies on it, and the problem surfaces much later, somewhere else.",
    ask: "Could anything in this change report success for an operation that failed?",
    stage: "prototype",
    check: "ai-review",
    severity: "high",
  },
  {
    id: "BE-02",
    domain: "backend",
    title: "Request bodies have a size limit",
    rule: "The server limits how large a request body can be, with a limit that fits what each endpoint really needs.",
    why: "Without a limit, one oversized request can use up a server's memory and take it down for everyone.",
    ask: "Does every endpoint in this change have a sensible limit on the size of what it accepts?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
] satisfies RuleInput[];
