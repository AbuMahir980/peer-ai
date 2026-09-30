import type { ProfileInput } from "../profile.ts";

// Next.js, for apps whose screens and server code live together. It builds on React and Node.
// Examples are from a made-up bicycle repair booking service.

export const next: ProfileInput = {
  id: "next",
  name: "Next.js",
  prefix: "NEXT",
  about:
    "Full-stack apps in Next.js, where screens and server code share one repository: images sized for the screen, secrets that stay on the server, and server actions and route handlers treated as the public endpoints they are. It builds on the React and Node profiles.",
  stacks: ["next"],
  extends: ["react", "node"],
  rules: [
    {
      id: "NEXT-01",
      title: "Images go through Next's image component",
      rule: "Images are shown with `next/image`, which sizes and compresses each for the screen that asks, not with a plain `img`.",
      why: "A plain img sends the full-size file to every phone, and the page waits for it.",
      ask: "Does this change show an image with a plain img?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "PERF-07",
      enforcer: { tool: "eslint", rule: "@next/next/no-img-element" },
      examples: {
        file: "example.tsx",
        fails: 'export function Frame() {\n  return <img src="/frame.jpg" alt="A steel touring frame" />;\n}\n',
        passes:
          'import Image from "next/image";\nexport function Frame() {\n  return <Image src="/frame.jpg" alt="A steel touring frame" width={640} height={480} />;\n}\n',
      },
    },
    {
      id: "NEXT-02",
      title: "Secrets stay on the server",
      rule: "Nothing secret is in a `NEXT_PUBLIC_` variable, which is built into the page. Modules that hold secrets import `server-only`, so importing them from a client component fails the build.",
      why: "Anything a client component touches is sent to every browser, and one import is enough to send a secret with it.",
      ask: "Could anything secret in this change reach the browser?",
      stage: "prototype",
      check: "ai-review",
      severity: "critical",
      carries: "SEC-11",
    },
    {
      id: "NEXT-03",
      title: "Server actions and route handlers check who's calling",
      rule: "Every server action and route handler checks the caller may do this, to this record, on the server, as its first step.",
      why: "A server action is a public endpoint anyone can call directly, whatever the screen that normally calls it shows.",
      ask: "Does every server action and route handler in this change check the caller's permission first?",
      stage: "mvp",
      check: "ai-review",
      severity: "critical",
      carries: "SEC-03",
    },
    {
      id: "NEXT-04",
      title: "Server actions and route handlers check their input",
      rule: "Every server action and route handler checks its input against a schema before using it, whatever types the calling component declares.",
      why: "Types in the client are a promise the caller doesn't have to keep. The server gets whatever is sent.",
      ask: "Does every server action and route handler in this change check its input on the server?",
      stage: "prototype",
      check: "ai-review",
      severity: "high",
      carries: "SEC-05",
    },
    {
      id: "NEXT-05",
      title: "Every response sets its security headers",
      rule: "The security headers, such as a content security policy, are set for every route, in `next.config` or the proxy, which was called middleware before Next.js 16.",
      why: "Without them, a browser lets another site frame the page, and runs any script injected into it.",
      ask: "Do the app's responses set the security headers?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "SEC-17",
    },
  ],
};
