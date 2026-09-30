import type { ProfileInput } from "../profile.ts";

// Fastify. It builds on Node. Examples are from a made-up bicycle repair booking service.

export const fastify: ProfileInput = {
  id: "fastify",
  name: "Fastify",
  prefix: "FASTIFY",
  about:
    "APIs in Fastify: a schema on every route, for what comes in and what goes out, a body limit chosen on purpose, one error handler, and plugins that keep to themselves. It builds on the Node profile.",
  stacks: ["fastify"],
  extends: ["node"],
  rules: [
    {
      id: "FASTIFY-01",
      title: "Every route has a schema, in and out",
      rule: "Every route declares schemas for its body, parameters, query and responses, so Fastify checks what comes in and sends only the fields the response schema names.",
      why: "Without a response schema, Fastify sends whatever the handler returns, including fields the client should never see.",
      ask: "Does every route in this change declare its request and response schemas?",
      stage: "prototype",
      check: "ai-review",
      severity: "high",
      carries: "SEC-05",
    },
    {
      id: "FASTIFY-02",
      title: "Request bodies stay under {value}",
      rule: "`bodyLimit` stays at {value} or below, raised only for a route that needs more, such as an upload.",
      why: "Raising the limit for everything lets one request fill the server's memory.",
      ask: "Does this change raise the body limit beyond {value}, or for more than the routes that need it?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "BE-02",
      default: { value: "1 MiB" },
    },
    {
      id: "FASTIFY-03",
      title: "One error handler answers every error the same way",
      rule: "`setErrorHandler` answers every error in the project's error shape, without stack traces or internal detail.",
      why: "Errors answered route by route drift apart, and the client can't handle them one way.",
      ask: "Does every error in this change go through the one error handler?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "API-04",
    },
    {
      id: "FASTIFY-04",
      title: "Plugins keep what they add to themselves",
      rule: "A plugin's decorators and hooks stay inside it. One is shared with `fastify-plugin` only when the whole app needs it, and says so.",
      why: "Sharing everything by default makes each plugin depend on the others' insides, so none can change alone.",
      ask: "Does this change share a plugin's decorators or hooks beyond the code that needs them?",
      stage: "mvp",
      check: "ai-review",
      severity: "low",
      carries: "ARC-03",
    },
  ],
};
