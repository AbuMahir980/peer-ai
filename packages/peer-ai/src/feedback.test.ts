import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FEEDBACK_REPO, draftFeedback, draftProblems, runFeedback, sendDraft, type Runner } from "./feedback.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");

const REPORT = {
  title: "check blocked a merge with no failing check",
  what: "It failed the build, but every line it printed was a pass.",
  expected: "A failed build names the check that failed.",
};

function drafted(): { root: string; draft: string } {
  const root = project({});
  const result = draftFeedback(root, undefined, REPORT, { tool: "claude-code" }, NOW);
  if (!result.ok) throw new Error(result.error);
  return { root, draft: result.value.draft };
}

/** A GitHub CLI that's signed in, and records what it was asked. */
function signedIn(calls: string[][]): Runner {
  return (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === "auth") return "Logged in";
    return `Creating issue in ${FEEDBACK_REPO}\n\nhttps://github.com/${FEEDBACK_REPO}/issues/99\n`;
  };
}

describe("feedback", () => {
  it("refuses code, keys, tokens and email addresses, and lets plain words through", () => {
    const words = { title: "A title", expected: "Nothing." };
    const refused = (what: string) => draftProblems({ ...words, what }).length > 0;
    expect(refused("Here is the code:\n```ts\nconst a = 1;\n```")).toBe(true);
    // Fake keys, built here so that no key-shaped text sits in the repository for scanners to flag.
    expect(refused(`The key ${["sk", "live", "x".repeat(24)].join("_")} leaked.`)).toBe(true);
    expect(refused(`Token ${["ghp", "a1".repeat(18)].join("_")}`)).toBe(true);
    expect(refused(`AWS key ${"AKIA"}${"Q".repeat(16)}`)).toBe(true);
    expect(refused("Write to ada@example.com")).toBe(true);
    expect(refused("security-review reported a test fixture at critical, in commit 3f882a9.")).toBe(false);
  });

  it("lists the drafts waiting, and drops one", () => {
    const { root, draft } = drafted();
    const out = capture();
    expect(runFeedback({ cwd: root }, out)).toBe(0);
    expect(out.text()).toContain("2026-10-02-check-blocked-a-merge-with-no-failing-check.md: check blocked");

    expect(runFeedback({ cwd: root, action: "drop", draft }, capture())).toBe(0);
    expect(existsSync(join(root, draft))).toBe(false);
    const empty = capture();
    runFeedback({ cwd: root }, empty);
    expect(empty.text()).toContain("No feedback drafts are waiting.");
  });

  it("sends a draft through the GitHub CLI when it's signed in, and keeps it as sent", () => {
    const { root, draft } = drafted();
    const calls: string[][] = [];
    const sent = sendDraft(root, draft, signedIn(calls));
    expect(sent).toEqual({ ok: true, value: { issue: `https://github.com/${FEEDBACK_REPO}/issues/99` } });
    expect(calls[1]).toEqual(
      expect.arrayContaining(["issue", "create", "--repo", FEEDBACK_REPO, "--title", REPORT.title, "--label"]),
    );
    const kept = join(root, ".peer-ai/feedback/sent/2026-10-02-check-blocked-a-merge-with-no-failing-check.md");
    expect(readFileSync(kept, "utf8")).toContain(`Sent as https://github.com/${FEEDBACK_REPO}/issues/99`);
    expect(existsSync(join(root, draft))).toBe(false);
  });

  it("gives a link to submit by hand when the GitHub CLI isn't signed in, and keeps the draft", () => {
    const { root, draft } = drafted();
    const out = capture();
    expect(runFeedback({ cwd: root, action: "send", draft, run: () => undefined }, out)).toBe(0);
    expect(out.text()).toContain(`https://github.com/${FEEDBACK_REPO}/issues/new?title=check+blocked`);
    expect(existsSync(join(root, draft))).toBe(true);
  });

  it("never reads a file outside the drafts folder", () => {
    const root = project({ "peer-ai.config.json": "{}" });
    const out = capture();
    expect(runFeedback({ cwd: root, action: "send", draft: "../../peer-ai.config.json" }, out)).toBe(1);
    expect(out.text()).toContain("There's no draft peer-ai.config.json.");
  });
});
