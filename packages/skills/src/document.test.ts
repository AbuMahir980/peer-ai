import { describe, expect, it } from "vitest";
import { checkDocument, describeProblems, headingKey, templateParts } from "./document.ts";

const TEMPLATE = `# Requirements: {{product}}

## Problem

{{Who has the problem, and what it costs them today}}

## Needs

### {{Need}}

{{Why it matters}}

## Out of scope (optional)

{{Ideas that wait}}

## {{Feature name}}

{{What it does}}
`;

const rules = { ruleIds: new Set(["REQ-01", "REQ-02"]), corePrefixes: new Set(["REQ", "SEC"]) };

describe("templateParts", () => {
  it("lists each part, marks the optional ones, and leaves out repeated sections", () => {
    expect(templateParts(TEMPLATE)).toEqual([
      { title: "Problem", required: true },
      { title: "Needs", required: true },
      { title: "Out of scope", required: false },
    ]);
  });

  it("ignores headings inside fenced code", () => {
    expect(templateParts("# T\n\n## Real\n\ntext\n\n```md\n## Not a part\n```\n")).toEqual([
      { title: "Real", required: true },
    ]);
  });
});

describe("headingKey", () => {
  it("ignores case, numbering and trailing punctuation", () => {
    expect(headingKey("2. The Problem:")).toBe(headingKey("the problem"));
    expect(headingKey("1) Needs")).toBe("needs");
  });
});

describe("checkDocument", () => {
  it("passes a document with every required part filled in", () => {
    const document =
      "# Requirements: Courier\n\n## 1. Problem\n\nSenders can't book a pickup online.\n\n## Needs\n\n### Book a pickup\n\nMost bookings come by phone. REQ-02 applies.\n";
    expect(checkDocument(document, TEMPLATE, rules)).toEqual({
      missing: [],
      empty: [],
      placeholders: [],
      unknownRules: [],
    });
  });

  it("names missing and empty parts, leftover template text and unknown rule ids", () => {
    const document =
      "# Requirements: {{product}}\n\n## Problem\n\n<!-- to do -->\n\n## Scope\n\nSee REQ-09 and SEC-99, and ISO-27001 and UTF-8.\n";
    expect(checkDocument(document, TEMPLATE, rules)).toEqual({
      missing: ["Needs"],
      empty: ["Problem"],
      placeholders: ["{{product}}"],
      unknownRules: ["REQ-09", "SEC-99"],
    });
  });

  it("counts a subsection as content", () => {
    const document = "# R\n\n## Problem\n\n### Senders\n\n## Needs\n\nOne.\n";
    expect(checkDocument(document, TEMPLATE, rules).empty).toEqual([]);
  });

  it("ignores template text inside a comment", () => {
    const document = "# R\n\n## Problem\n\nText. <!-- {{hint}} -->\n\n## Needs\n\nOne.\n";
    expect(checkDocument(document, TEMPLATE, rules).placeholders).toEqual([]);
  });

  it("stays fast on a long line of braces", () => {
    const started = performance.now();
    checkDocument(`# R\n\n## Problem\n\n${"{{".repeat(50_000)}\n`, TEMPLATE, rules);
    checkDocument(`# R\n\n## Problem${" ".repeat(50_000)}x\n\n${"<!--".repeat(50_000)}\n`, TEMPLATE, rules);
    headingKey(`${" ".repeat(50_000)}x`);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("describeProblems", () => {
  it("says what to change for each kind of problem", () => {
    expect(
      describeProblems({
        missing: ["Needs"],
        empty: ["Problem"],
        placeholders: ["{{product}}"],
        unknownRules: ["REQ-09"],
      }),
    ).toEqual([
      "Add the missing parts, each under its own heading: Needs.",
      "Fill in the empty parts: Problem.",
      "Replace the template text still in the document: {{product}}.",
      "These aren't Peer AI rule ids: REQ-09. Correct or remove them.",
    ]);
  });

  it("says nothing about a ready document", () => {
    expect(describeProblems({ missing: [], empty: [], placeholders: [], unknownRules: [] })).toEqual([]);
  });
});
