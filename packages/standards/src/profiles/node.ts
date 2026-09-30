import type { ProfileInput } from "../profile.ts";

// Node on the server, and the base for Express, NestJS, Fastify and Next.js. Examples are from a
// made-up bicycle repair booking service.

export const node: ProfileInput = {
  id: "node",
  name: "Node",
  prefix: "NODE",
  about:
    "Node on the server: no code built from strings, calls to other services that give up, settings checked once at start-up, and failures that stop the process instead of hiding. Express, NestJS, Fastify and Next.js build on it.",
  stacks: ["node"],
  extends: ["typescript"],
  rules: [
    {
      id: "NODE-01",
      title: "No code is built from strings",
      rule: "`eval` isn't used, so no text, least of all text from outside, is ever run as code.",
      why: "A string that reaches eval runs with everything the server can reach: its secrets, its database and its files.",
      ask: "Does this change use eval?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "SEC-06",
      enforcer: { tool: "eslint", rule: "no-eval" },
      examples: {
        file: "example.ts",
        fails: "export function price(formula: string): number {\n  return Number(eval(formula));\n}\n",
        passes: "export function price(labour: number, parts: number): number {\n  return labour + parts;\n}\n",
      },
    },
    {
      id: "NODE-02",
      title: "Every call to another service gives up in time",
      rule: "A call to another service, such as with `fetch`, has a timeout, such as `AbortSignal.timeout`, and its failure is handled, not left to hang or crash the request.",
      why: "Node's fetch waits as long as the other side does. One slow service then holds every request that calls it.",
      ask: "Does every call to another service in this change have a timeout and handle failure?",
      stage: "mvp",
      check: "ai-review",
      severity: "high",
      carries: "REL-01",
    },
    {
      id: "NODE-03",
      title: "Settings are read and checked once, at start-up",
      rule: "`process.env` is read in one module that checks every setting at start-up, such as with a schema, and the process stops when one is missing or wrong. The rest of the code imports the checked values.",
      why: "A setting read where it's used fails the first request that needs it, in production, long after the deploy looked fine.",
      ask: "Does this change read process.env outside the settings module?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "REL-04",
    },
    {
      id: "NODE-04",
      title: "A promise that fails where nothing catches it stops the process",
      rule: "Nothing swallows unhandled rejections: no `process.on('unhandledRejection')` handler that carries on. The process stops, and the platform restarts it.",
      why: "A process that carries on after an unexpected failure runs in a state nobody designed, and fails in stranger ways later.",
      ask: "Does this change let the process carry on after an unhandled rejection?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "BE-01",
    },
  ],
};
