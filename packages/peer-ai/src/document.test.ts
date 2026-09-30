import { availableSkills, documentInfo, loadSkill, templatePath } from "peer-ai-skills";
import { MAP_ITEM_SKILLS, SKILL_KINDS, type KnownMapItemId, type SkillId } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { assess } from "./assess.ts";
import { checkDocumentFile, runCheckDocument } from "./document.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const documentSkills = () => availableSkills().filter((id) => SKILL_KINDS[id] === "document");

/** The skill's own template with every part filled in, as a finished document would have it. */
function filledIn(id: SkillId): string {
  const files = loadSkill(id);
  const template = files.get(templatePath(documentInfo(files).templates[0] ?? "")) ?? "";
  return template.replace(/\{\{[^{}\n]+\}\}/g, "Written from the brief.");
}

const REQUIREMENTS = "docs/requirements.md";

describe("checking a document", () => {
  it("passes a document with every part of its template filled in", () => {
    const root = project({ [REQUIREMENTS]: filledIn("requirements-analysis") });
    const checked = checkDocumentFile(root, { skill: "requirements-analysis", path: REQUIREMENTS });
    expect(checked).toMatchObject({ ok: true, value: { ready: true, template: "requirements", problems: [] } });
  });

  it("names what's missing, empty, left from the template or not a rule", () => {
    const document = filledIn("requirements-analysis")
      .replace(/## Scope\n[\s\S]*?(?=## )/, "")
      .replace("## Summary\n\nWritten from the brief.", "## Summary\n")
      .replace("# Requirements: Written from the brief.", "# Requirements: {{product or feature}}\n\nSee REQ-09.");
    const root = project({ [REQUIREMENTS]: document });
    const checked = checkDocumentFile(root, { skill: "requirements-analysis", path: REQUIREMENTS });
    expect(checked).toMatchObject({
      ok: true,
      value: {
        ready: false,
        missing: ["Scope"],
        empty: ["Summary"],
        placeholders: ["{{product or feature}}"],
        unknownRules: ["REQ-09"],
      },
    });
  });

  it.each([
    ["an unknown skill", { skill: "haiku-writer", path: REQUIREMENTS }, "isn't one of Peer AI's skills"],
    ["a review skill", { skill: "security-review", path: REQUIREMENTS }, "record its report with record_review"],
    ["a work skill", { skill: "issue-planning", path: REQUIREMENTS }, "the work item's own gates check it"],
    [
      "a template the skill doesn't have",
      { skill: "requirements-analysis", path: REQUIREMENTS, template: "poem" },
      "has no template called poem. Its templates are: requirements",
    ],
    ["a path outside the project", { skill: "requirements-analysis", path: "../elsewhere.md" }, "outside the project"],
    [
      "no document",
      { skill: "requirements-analysis", path: "docs/nothing.md" },
      "There is no document at docs/nothing.md",
    ],
  ])("refuses %s", (_, input, expected) => {
    const checked = checkDocumentFile(project({ [REQUIREMENTS]: "# R\n" }), input);
    expect(checked.ok ? "" : checked.error).toContain(expected);
  });

  it("says so from the shell, with an exit code for CI", () => {
    const root = project({ [REQUIREMENTS]: filledIn("requirements-analysis"), "docs/empty.md": "# Requirements\n" });
    const ready = capture();
    expect(
      runCheckDocument({ cwd: root, skill: "requirements-analysis", path: REQUIREMENTS, json: false }, ready),
    ).toBe(0);
    expect(ready.text()).toBe(`✓ ${REQUIREMENTS} has every part of the requirements-analysis template.`);
    const notReady = capture();
    expect(
      runCheckDocument({ cwd: root, skill: "requirements-analysis", path: "docs/empty.md", json: false }, notReady),
    ).toBe(1);
    expect(notReady.text()).toContain(
      "✗ docs/empty.md isn't ready:\n- Add the missing parts, each under its own heading: Summary",
    );
    const json = capture();
    runCheckDocument({ cwd: root, skill: "requirements-analysis", path: REQUIREMENTS, json: true }, json);
    expect(JSON.parse(json.text())).toMatchObject({ ok: true, ready: true });
  });
});

describe("the document skills", () => {
  it("save their document where the project map finds it", () => {
    for (const id of documentSkills()) {
      const path = (documentInfo(loadSkill(id)).path ?? "").replace(/<[^>]+>/g, "example");
      const items = (Object.entries(MAP_ITEM_SKILLS) as [KnownMapItemId, string[]][])
        .filter(([, skills]) => skills.includes(id))
        .map(([item]) => item);
      const assessment = assess(project({ [path]: filledIn(id) }), undefined, "mvp");
      for (const item of items) {
        // A test strategy is a start on the tests item, and a README on the docs item; only tests
        // themselves, and a docs folder beside the README, make them present.
        const status = item === "tests" || item === "docs" ? "partial" : "present";
        expect(assessment.items[item], `${id} writes ${path}, which the map's ${item} item must find`).toMatchObject({
          status,
          evidence: [path],
        });
      }
    }
  });
});
