import { readFileSync } from "node:fs";
import { CORE_RULES } from "@peer-ai/standards";
import { DOMAINS, ReviewReportSchema, SEVERITIES, SKILL_IDS, SKILL_KINDS, deriveResult } from "@peer-ai/workflow";
import { describe, expect, it } from "vitest";
import {
  LIMITS,
  availableSkills,
  buildSkill,
  checkDescriptionBudget,
  loadSkill,
  parseSkillMd,
  rulesReference,
  validateSkill,
  type SkillFiles,
} from "./index.ts";

const expectations = (name: string, id: keyof typeof SKILL_KINDS = "security-review") => ({
  name,
  kind: SKILL_KINDS[id],
  ruleIds: new Set(CORE_RULES.map((rule) => rule.id)),
  corePrefixes: new Set<string>(Object.values(DOMAINS)),
});

const DESCRIPTION =
  "Reviews code for security holes against Peer AI's rules and records a report with proof for every rule. Use when a change touches sign-in, permissions, input, uploads or secrets.";

const skillMd = (fields: string, body: string) => `---\n${fields}\n---\n\n${body}\n`;
const FIELDS = [
  "name: security-review",
  `description: ${DESCRIPTION}`,
  "license: MIT",
  "metadata:",
  "  peer-ai-kind: review",
  "  peer-ai-domains: security",
].join("\n");
const BODY = [
  "# Security review",
  "",
  "Check SEC-01 on every route. The rules are in [rules.md](references/rules.md), the levels in [severity.md](references/severity.md) and the format in [report.md](references/report.md). How to check access: [access-control.md](references/access-control.md).",
  "",
  "Record the report with the peer-ai MCP tool `record_review`, then run `npx peer-ai check`.",
].join("\n");
const OPENAI = [
  "interface:",
  '  display_name: "Security review"',
  '  short_description: "Find security holes and prove every rule was checked"',
  '  default_prompt: "Use ${{name}} to review this change for security problems."',
].join("\n");

const DOC_FIELDS = [
  "name: requirements-analysis",
  "description: Writes a product's requirements, with a source for every statement. Use when requirements are missing.",
  "license: MIT",
  "metadata:",
  "  peer-ai-kind: document",
  "  peer-ai-domains: requirements",
  "  peer-ai-templates: requirements",
  "  peer-ai-path: docs/requirements.md",
  "",
].join("\n");
const DOC_BODY =
  "# Requirements analysis\n\nFill in the [template](assets/requirements.md), then check it with the peer-ai MCP tool `check_document`.";
const documentSource = (): SkillFiles =>
  new Map([
    ["SKILL.md", skillMd(DOC_FIELDS, DOC_BODY)],
    ["assets/requirements.md", "# Requirements: {{product}}\n\n## Problem\n\n{{Who has it}}\n"],
  ]);

const source = (): SkillFiles =>
  new Map([
    ["SKILL.md", skillMd(FIELDS, BODY)],
    ["references/access-control.md", "# Access control\n\nSEC-01: check the record, not only the role.\n"],
    ["agents/openai.yaml", OPENAI],
  ]);

const problemsWith = (change: (files: SkillFiles) => void, name = "security-review"): string[] => {
  const files = buildSkill("security-review", source(), { name });
  change(files);
  return validateSkill(files, expectations(name));
};
const setSkillMd =
  (fields: string, body = BODY) =>
  (files: SkillFiles) =>
    files.set("SKILL.md", skillMd(fields, body));

describe("building a skill", () => {
  it("adds the generated references and passes validation, under its id or a prefixed name", () => {
    const built = buildSkill("security-review", source());
    expect([...built.keys()].sort()).toEqual([
      "SKILL.md",
      "agents/openai.yaml",
      "references/access-control.md",
      "references/report.md",
      "references/rules.md",
      "references/severity.md",
    ]);
    expect(validateSkill(built, expectations("security-review"))).toEqual([]);

    const prefixed = buildSkill("security-review", source(), { name: "peer-ai-security-review" });
    expect(prefixed.get("SKILL.md")).toMatch(/^---\nname: peer-ai-security-review\n/);
    expect(prefixed.get("agents/openai.yaml")).toContain("Use $peer-ai-security-review to review");
    expect(validateSkill(prefixed, expectations("peer-ai-security-review"))).toEqual([]);
  });

  it("generates the rules for the skill's domains, with a table of contents", () => {
    const rules = rulesReference(["security", "privacy-compliance"]);
    expect(rules).toContain(
      "## Contents\n\n- Security: SEC-01 to SEC-27\n- Privacy and compliance: PRIV-01 to PRIV-06",
    );
    for (const rule of CORE_RULES.filter((rule) => ["security", "privacy-compliance"].includes(rule.domain))) {
      expect(rules).toContain(`### ${rule.id} ${rule.title}`);
    }
    expect(rules).toContain("- From MVP. Checked by AI review. Severity: high.");
    expect(rules).toContain("- Source: OWASP ASVS 5.0, 8.2.2, level 1.");
    expect(rulesReference(["ai-features"])).toContain("- Only for products with: ai-features.");
  });

  it("adds single rules from other domains, grouped under their own domain", () => {
    const rules = rulesReference(["security"], ["TEST-08", "PRIV-01"]);
    expect(rules).toContain("- Security: SEC-01 to SEC-27\n- Privacy and compliance: PRIV-01\n- Testing: TEST-08\n");
    expect(rules).toContain("## Testing");
    expect(rules).not.toContain("### TEST-01");
  });

  it("gives only review skills the severity scale and report format", () => {
    const document = new Map([
      ["SKILL.md", skillMd(FIELDS.replace("security-review", "threat-model"), "# Threat model")],
    ]);
    expect([...buildSkill("threat-model", document).keys()].sort()).toEqual(["SKILL.md", "references/rules.md"]);
  });
});

describe("validating a skill", () => {
  it.each<[string, (files: SkillFiles) => void, string]>([
    ["no SKILL.md", (files) => files.delete("SKILL.md"), "SKILL.md is missing."],
    ["no frontmatter", (files) => files.set("SKILL.md", BODY), "must start with YAML frontmatter"],
    ["an unknown field", setSkillMd(`${FIELDS}\nauthor: Ada`), '"author" isn\'t a field the standard allows'],
    [
      "a name that isn't the folder's",
      setSkillMd(FIELDS.replace("name: security-review", "name: sec-review")),
      'name is "sec-review"',
    ],
    [
      "a badly formed name",
      setSkillMd(FIELDS.replace("name: security-review", "name: Security--Review")),
      "only lowercase letters",
    ],
    [
      "a reserved word in the name",
      setSkillMd(FIELDS.replace("name: security-review", "name: claude-review")),
      'can\'t contain "anthropic" or "claude"',
    ],
    [
      "a long description",
      setSkillMd(FIELDS.replace(DESCRIPTION, `${DESCRIPTION} ${"More words. ".repeat(10)}`)),
      "the limit is 250",
    ],
    [
      "a description in the second person",
      setSkillMd(FIELDS.replace("Reviews code", "Helps you review code")),
      "third person",
    ],
    [
      "a description that doesn't say when",
      setSkillMd(FIELDS.replace(" Use when a change touches sign-in, permissions, input, uploads or secrets.", "")),
      "must say when",
    ],
    [
      "an XML tag in the description",
      setSkillMd(FIELDS.replace("security holes", "<b>security</b> holes")),
      "can't contain XML tags",
    ],
    ["no license", setSkillMd(FIELDS.replace("license: MIT\n", "")), 'license must be "MIT"'],
    [
      "the wrong kind",
      setSkillMd(FIELDS.replace("peer-ai-kind: review", "peer-ai-kind: document")),
      "makes this skill a review skill",
    ],
    [
      "an unknown domain",
      setSkillMd(FIELDS.replace("peer-ai-domains: security", "peer-ai-domains: security crypto")),
      '"crypto", which isn\'t a standards domain',
    ],
    [
      "an unknown single rule",
      setSkillMd(`${FIELDS}\n  peer-ai-rules: PRIV-01 PRIV-99`),
      "peer-ai-rules names PRIV-99",
    ],
    ["a body over 500 lines", setSkillMd(FIELDS, `${BODY}\n${"More.\n".repeat(500)}`), "keep it under 500"],
    ["role-play", setSkillMd(FIELDS, `You are a security engineer.\n\n${BODY}`), "no role-play"],
    ["a request to switch models", setSkillMd(FIELDS, `Switch to a stronger model first.\n\n${BODY}`), "switch models"],
    ["a README in the skill", (files) => files.set("README.md", "# Notes"), "people's documentation lives outside it"],
    [
      "a broken link",
      setSkillMd(FIELDS, `${BODY}\nSee [uploads](references/uploads.md).`),
      "points to a file the skill doesn't have",
    ],
    [
      "a link outside the skill",
      setSkillMd(FIELDS, `${BODY}\nSee [the RFC](../../rfcs/0004.md).`),
      "points outside the skill",
    ],
    [
      "a backslash in a link",
      setSkillMd(FIELDS, `${BODY}\nSee [access](references\\access-control.md).`),
      "use forward slashes",
    ],
    [
      "a reference linking another",
      (files) => files.set("references/access-control.md", "See [rules](rules.md)."),
      "keep references one level deep",
    ],
    [
      "a long reference with no contents",
      (files) => files.set("references/access-control.md", "# Access\n" + "A line.\n".repeat(120)),
      'needs a "## Contents" list',
    ],
    [
      "a rule that doesn't exist",
      setSkillMd(FIELDS, `${BODY}\nAlso check SEC-99.`),
      "SEC-99, which isn't one of Peer AI's rules",
    ],
    [
      "a tool that doesn't exist",
      setSkillMd(FIELDS, `${BODY}\nCall the peer-ai MCP tool \`review_code\`.`),
      "the peer-ai tool review_code",
    ],
    [
      "a tool named like a shell command",
      setSkillMd(FIELDS, `${BODY}\nCall the peer-ai \`next_work\` tool.`),
      "so it isn't mistaken for a shell command",
    ],
    [
      "a command that doesn't exist",
      setSkillMd(FIELDS, `${BODY}\nRun \`npx peer-ai review\`.`),
      "peer-ai review, which isn't a peer-ai command",
    ],
    [
      "a short openai.yaml blurb",
      (files) =>
        files.set(
          "agents/openai.yaml",
          OPENAI.replace("Find security holes and prove every rule was checked", "Security"),
        ),
      "25 to 64 characters",
    ],
    [
      "an openai.yaml prompt that doesn't name the skill",
      (files) => files.set("agents/openai.yaml", OPENAI.replace("${{name}}", "the skill")),
      "must name the skill as $security-review",
    ],
  ])("reports %s", (_, change, expected) => {
    expect(problemsWith(change).join("\n")).toContain(expected);
  });

  it("reports a review skill that never records its report", () => {
    expect(
      problemsWith(setSkillMd(FIELDS, BODY.replace("the peer-ai MCP tool `record_review`", "a tool"))).join("\n"),
    ).toContain("a review skill ends by handing its output to the peer-ai MCP tool `record_review`");
  });

  it("reports templates on a skill that doesn't write documents", () => {
    expect(problemsWith(setSkillMd(`${FIELDS}\n  peer-ai-templates: requirements`)).join("\n")).toContain(
      "only document skills have metadata.peer-ai-templates",
    );
  });

  it.each<[string, (files: SkillFiles) => void, string]>([
    [
      "no templates",
      (files) =>
        files.set("SKILL.md", skillMd(DOC_FIELDS.replace("  peer-ai-templates: requirements\n", ""), DOC_BODY)),
      "metadata.peer-ai-templates must name the document's templates",
    ],
    [
      "a template that isn't there",
      (files) => files.delete("assets/requirements.md"),
      "names requirements, but assets/requirements.md is missing",
    ],
    [
      "no path",
      (files) =>
        files.set("SKILL.md", skillMd(DOC_FIELDS.replace("  peer-ai-path: docs/requirements.md\n", ""), DOC_BODY)),
      "metadata.peer-ai-path must say where the document is saved",
    ],
    [
      "a path outside the project",
      (files) =>
        files.set("SKILL.md", skillMd(DOC_FIELDS.replace("docs/requirements.md", "../requirements.md"), DOC_BODY)),
      "must be a path inside the project",
    ],
    [
      "a template with no title",
      (files) => files.set("assets/requirements.md", "## Problem\n\n{{Who}}\n"),
      'start with the document\'s title, as a "# " heading',
    ],
    [
      "a template with no required part",
      (files) => files.set("assets/requirements.md", "# Requirements\n\n## Notes (optional)\n\n{{Anything}}\n"),
      "at least one required part",
    ],
    [
      "no check at the end",
      (files) =>
        files.set("SKILL.md", skillMd(DOC_FIELDS, DOC_BODY.replace("the peer-ai MCP tool `check_document`", "a tool"))),
      "a document skill ends by handing its output to the peer-ai MCP tool `check_document`",
    ],
  ])("reports a document skill with %s", (_, change, expected) => {
    const files = buildSkill("requirements-analysis", documentSource());
    change(files);
    expect(validateSkill(files, expectations("requirements-analysis", "requirements-analysis")).join("\n")).toContain(
      expected,
    );
  });

  it("accepts a well-formed document skill", () => {
    const files = buildSkill("requirements-analysis", documentSource());
    expect(validateSkill(files, expectations("requirements-analysis", "requirements-analysis"))).toEqual([]);
  });

  it("stays fast on text full of unclosed links", () => {
    const hostile = "](!".repeat(50_000);
    const started = performance.now();
    problemsWith(setSkillMd(FIELDS, `${BODY}\n${hostile}`));
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("keeps all the descriptions within Codex's budget together", () => {
    const full = (count: number) => Array.from({ length: count }, () => "x".repeat(LIMITS.description));
    expect(checkDescriptionBudget(full(29))).toEqual([]);
    expect(checkDescriptionBudget(full(33))).toEqual([
      "The skills' descriptions total 8250 characters; together they must fit in 8000.",
    ]);
  });
});

describe("the shared references", () => {
  it("has a report example that is valid, and whose result Peer AI agrees with", () => {
    const text = readFileSync(new URL("../shared/report.md", import.meta.url), "utf8");
    const example = /```json\n([\s\S]*?)\n```/.exec(text)?.[1] ?? "";
    const report = ReviewReportSchema.parse(JSON.parse(example));
    expect(report.result).toBe(deriveResult(report));
    for (const { rule } of report.coverage) expect(CORE_RULES.map((known) => known.id)).toContain(rule);
  });

  it("has the severity scale in the report format's order", () => {
    const text = readFileSync(new URL("../shared/severity.md", import.meta.url), "utf8");
    const levels = [...text.matchAll(/^\| (critical|high|medium|low) \|/gm)].map((match) => match[1]);
    expect(levels).toEqual([...SEVERITIES]);
  });
});

describe("the skills", () => {
  it("gives every skill a kind: 15 reviews, 10 documents and 4 kinds of work", () => {
    const count = (kind: string) => SKILL_IDS.filter((id) => SKILL_KINDS[id] === kind).length;
    expect([count("review"), count("document"), count("work")]).toEqual([15, 10, 4]);
  });

  it("builds and validates every skill written so far, under its id and with the peer-ai- prefix", () => {
    const descriptions: string[] = [];
    for (const id of availableSkills()) {
      for (const name of [id, `peer-ai-${id}`]) {
        expect(validateSkill(loadSkill(id, { name }), expectations(name, id)), `${id} as ${name}`).toEqual([]);
      }
      const parsed = parseSkillMd(loadSkill(id).get("SKILL.md") ?? "");
      descriptions.push(parsed.ok ? String(parsed.value.frontmatter.description) : "");
    }
    expect(checkDescriptionBudget(descriptions)).toEqual([]);
  });
});
