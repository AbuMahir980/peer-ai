import { describe, expect, it } from "vitest";
import { entries, notes, section } from "./release-notes.ts";

const CLI = `# peer-ai

## 1.0.1

### Minor Changes

- abc1234: \`render\` sets up the CI gate.

### Patch Changes

- Updated dependencies [abc1234]
  - peer-ai-workflow@1.0.1

## 1.0.0

### Major Changes

- def5678: The first release.

  - **peer-ai:** the command.
`;

const SKILLS = `# peer-ai-skills

## 1.0.1

### Minor Changes

- 9876fed: \`code-review\` checks each changed line against the rules it can touch.

### Patch Changes

- Updated dependencies [abc1234]
  - peer-ai-workflow@1.0.1
`;

const WORKFLOW = `# peer-ai-workflow

## 1.0.1

### Minor Changes

- abc1234: \`render\` sets up the CI gate.
`;

describe("release notes", () => {
  it("read one version's section and its entries, without the dependency updates", () => {
    expect(section(CLI, "1.0.0")).toContain("def5678: The first release.");
    expect(section(CLI, "2.0.0")).toBeUndefined();
    expect(entries(section(CLI, "1.0.1") ?? "")).toEqual([
      { commit: "abc1234", text: "`render` sets up the CI gate." },
    ]);
    expect(entries(section(CLI, "1.0.0") ?? "")).toEqual([
      { commit: "def5678", text: "The first release.\n\n- **peer-ai:** the command." },
    ]);
  });

  it("gather every package's changes once each, naming the packages, and say how to update", () => {
    const text = notes({ "peer-ai": CLI, "peer-ai-skills": SKILLS, "peer-ai-workflow": WORKFLOW }, "1.0.1") ?? "";
    expect(text).toContain("- `render` sets up the CI gate. (peer-ai, peer-ai-workflow)");
    expect(text).toContain("- `code-review` checks each changed line against the rules it can touch. (peer-ai-skills)");
    expect(text).not.toContain("Updated dependencies");
    expect(text).toContain("npx --prefer-online peer-ai@latest render");
    expect(notes({ "peer-ai": CLI }, "1.0.0")).toContain(
      "- The first release. (peer-ai)\n\n  - **peer-ai:** the command.",
    );
    expect(notes({ "peer-ai": CLI }, "3.0.0")).toBeUndefined();
  });
});
