import { describe, expect, it } from "vitest";
import { changesBetween, ownChangelog, parseChangelog } from "./changelog.ts";

const CHANGELOG = `# peer-ai

## 1.0.0-next.9

### Minor Changes

- 88de847: CI's run of the verify command can count as the verify (RFC 0013), so nobody runs it again.

  - **\`run_verify\`** takes it.

### Patch Changes

- Updated dependencies [88de847]
  - peer-ai-workflow@1.0.0-next.9

## 1.0.0-next.8

### Minor Changes

- bb558a4: The MCP server's replies fit what an AI tool can take in (RFC 0012): next_work in brief.

## 1.0.0-next.7

### Patch Changes

- 9d737f1: **Report-only jobs** finish green. More text.
`;

describe("what changed between two versions (RFC 0014)", () => {
  it("is the first sentence of each change, without dependency bumps", () => {
    expect(parseChangelog(CHANGELOG).map(({ version, changes }) => [version, changes.length])).toEqual([
      ["1.0.0-next.9", 1],
      ["1.0.0-next.8", 1],
      ["1.0.0-next.7", 1],
    ]);
  });

  it("covers the versions after the one last used, up to the one now, oldest first", () => {
    expect(changesBetween(CHANGELOG, "1.0.0-next.7", "1.0.0-next.9")).toEqual([
      "1.0.0-next.8: The MCP server's replies fit what an AI tool can take in (RFC 0012).",
      "1.0.0-next.9: CI's run of the verify command can count as the verify (RFC 0013), so nobody runs it again.",
    ]);
    expect(changesBetween(CHANGELOG, "1.0.0-next.6", "1.0.0-next.7")).toEqual([
      "1.0.0-next.7: Report-only jobs finish green.",
    ]);
  });

  it("doesn't end a sentence at a full stop or a colon inside code", () => {
    const text =
      '## 1.0.0-next.10\n\n- 9eea4ce: With `"docs": { "readme": true }`, render keeps a section. More.\n- a473f61: While enforcement only reports (`standards.enforcement: "report"`), jobs finish green: here.\n';
    expect(changesBetween(text, "1.0.0-next.9", "1.0.0-next.10")).toEqual([
      '1.0.0-next.10: With `"docs": { "readme": true }`, render keeps a section.',
      '1.0.0-next.10: While enforcement only reports (`standards.enforcement: "report"`), jobs finish green.',
    ]);
  });

  it("reads the package's own changelog, which ships with it", () => {
    expect(parseChangelog(ownChangelog()).length).toBeGreaterThan(0);
  });
});
