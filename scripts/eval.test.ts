import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { skillRuleIds } from "@peer-ai/skills";
import { validateReport, type ReviewReport } from "@peer-ai/workflow";
import { afterEach, describe, expect, it } from "vitest";
import {
  DOCUMENT_RESULTS,
  GRADE_PROMPT,
  REVIEW_RESULTS,
  appendResult,
  collectReports,
  evalPrompt,
  evaluate,
  evaluateDocument,
  formatDocumentRun,
  formatRun,
  loadSheet,
  regradeDocument,
  scoreDocument,
  type ResolvedDefect,
  score,
  type Sheet,
  sheets,
  usedSkill,
} from "./eval.ts";

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A small answer sheet: two problems in one file, one in another. */
const SHEET: Sheet = {
  fixture: "courier",
  prompts: { "security-review": "Review it for security problems." },
  defects: [
    {
      id: "D1",
      title: "SQL injection",
      severity: "critical",
      skills: ["security-review"],
      locations: [],
      spans: [{ file: "api/parcels.py", line: 40, endLine: 40 }],
    },
    {
      id: "D2",
      title: "Anyone can read any parcel",
      severity: "high",
      skills: ["security-review", "code-review"],
      locations: [],
      spans: [
        { file: "api/parcels.py", line: 70, endLine: 71 },
        { file: "db/0001.sql", line: 5, endLine: 5 },
      ],
    },
    {
      id: "D3",
      title: "No timeout",
      severity: "medium",
      skills: ["reliability-review"],
      locations: [],
      spans: [{ file: "api/geocode.py", line: 7, endLine: 7 }],
    },
  ],
};

let findingNumber = 0;
const finding = (file: string, line: number, severity = "critical", endLine?: number) => ({
  id: `F${String(++findingNumber)}`,
  rule: "SEC-01",
  severity,
  status: "open",
  title: `A problem at ${file}:${String(line)}`,
  location: { file, line, ...(endLine === undefined ? {} : { endLine }) },
  evidence: "It's there.",
});

function report(findings: ReturnType<typeof finding>[], skill = "security-review"): ReviewReport {
  const result = validateReport({
    version: 1,
    skill,
    at: "2026-10-05T10:00:00Z",
    scope: {},
    inputs: [],
    inventory: [],
    coverage: [
      { rule: "SEC-00", status: "pass", evidence: "Checked." },
      ...findings.map((f) => ({ rule: f.rule, status: "fail", finding: f.id })),
    ],
    findings,
    result: findings.length > 0 ? "fail" : "pass",
    summary: "A review.",
  });
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.value;
}

describe("answer sheets", () => {
  it.each(sheets())("%s finds every planted problem, exactly once, in its practice project", (name) => {
    const sheet = loadSheet(name);
    expect(sheet.defects.length + Object.keys(sheet.documents ?? {}).length).toBeGreaterThan(0);
    for (const skill of Object.keys(sheet.documents ?? {})) expect(sheet.prompts).toHaveProperty([skill]);
    for (const defect of sheet.defects) {
      for (const span of defect.spans) expect(span.endLine).toBeGreaterThanOrEqual(span.line);
    }
  });

  it("keeps each project's planted problems specific: courier's first one is its signing key", () => {
    const d1 = loadSheet("courier").defects.find((defect) => defect.id === "D1");
    expect(d1?.spans).toEqual([{ file: "services/api/app/auth.py", line: 6, endLine: 6 }]);
  });
});

describe("marking a review", () => {
  it("counts a planted problem as found within three lines, at a severity no more than one level away", () => {
    const marked = score(SHEET, "security-review", [
      report([finding("api/parcels.py", 43), finding("./api/parcels.py", 66, "medium", 68)]),
    ]);
    expect(marked.expected.map(({ defect, foundBy }) => [defect.id, foundBy.length > 0])).toEqual([
      ["D1", true],
      ["D2", true],
    ]);
    expect(marked.ready).toBe(true);
  });

  it("doesn't count a problem too far away or two levels off, and lists findings that match nothing", () => {
    const marked = score(SHEET, "security-review", [
      report([finding("api/parcels.py", 44), finding("db/0001.sql", 5, "low"), finding("web/app.ts", 3, "low")]),
    ]);
    expect(marked.expected.every(({ foundBy }) => foundBy.length === 0)).toBe(true);
    expect(marked.unmatched.map((f) => f.location.file)).toEqual(["api/parcels.py", "db/0001.sql", "web/app.ts"]);
    expect(marked.reasons).toEqual(["it missed 1 critical problem", "it missed 1 high problem"]);
  });

  it("counts each finding for one planted problem at most: the nearest", () => {
    const nearby = (id: string, line: number): ResolvedDefect => ({
      id,
      title: "A problem",
      severity: "high",
      skills: ["security-review"],
      locations: [],
      spans: [{ file: "ai.ts", line, endLine: line }],
    });
    const close: Sheet = {
      ...SHEET,
      defects: [nearby("A", 10), nearby("B", 13)],
    };
    const marked = score(close, "security-review", [report([finding("ai.ts", 12, "high")])]);
    expect(marked.expected.map(({ defect, foundBy }) => [defect.id, foundBy.length])).toEqual([
      ["A", 0],
      ["B", 1],
    ]);
  });

  it("pairs findings with problems so that as many as possible are found", () => {
    const nearby = (id: string, line: number): ResolvedDefect => ({
      id,
      title: "A problem",
      severity: "high",
      skills: ["security-review"],
      locations: [],
      spans: [{ file: "ai.py", line, endLine: line }],
    });
    // Two findings that both cover lines 63 to 67, where two problems sit at 65 and 67. Each is
    // nearest to the first, but together they found both.
    const close: Sheet = { ...SHEET, defects: [nearby("A", 65), nearby("B", 67)] };
    const both = score(close, "security-review", [
      report([finding("ai.py", 62, "high", 67), finding("ai.py", 63, "high", 67)]),
    ]);
    expect(both.expected.map(({ defect, foundBy }) => [defect.id, foundBy.length])).toEqual([
      ["A", 1],
      ["B", 1],
    ]);
    // A third finding on the same lines has nothing left to find, and still isn't counted as unmatched.
    const three = score(close, "security-review", [
      report([finding("ai.py", 62, "high", 67), finding("ai.py", 63, "high", 67), finding("ai.py", 65, "high")]),
    ]);
    expect(three.expected.map(({ foundBy }) => foundBy.length)).toEqual([2, 1]);
    expect(three.unmatched).toEqual([]);
  });

  it("counts a problem found at any of its locations, and only a review's own reports", () => {
    const marked = score(SHEET, "security-review", [
      report([finding("db/0001.sql", 5, "high")]),
      report([finding("api/parcels.py", 40)], "code-review"),
    ]);
    expect(marked.expected.map(({ foundBy }) => foundBy.length)).toEqual([0, 1]);
    expect(marked.bySeverity.critical).toEqual({ found: 0, of: 1 });
  });

  it("isn't ready without a report, or when too few medium problems are found", () => {
    expect(score(SHEET, "security-review", []).reasons).toEqual([
      "it wrote no valid security-review report",
      "it missed 1 critical problem",
      "it missed 1 high problem",
    ]);
    expect(score(SHEET, "reliability-review", [report([], "reliability-review")]).reasons).toEqual([
      "it found 0 of 1 medium problems, under 80%",
    ]);
  });
});

describe("running an eval", () => {
  it("works on a copy without the answers, and marks the reports the tool writes", async () => {
    const sheet = loadSheet("courier");
    const d1 = sheet.defects[0]?.spans[0];
    const baseline = { baseline: true };
    const result = await evaluate(
      sheet,
      "security-review",
      "claude-code",
      (_tool, dir, prompt) => {
        made.push(dir, `${dir}.log`);
        expect(existsSync(join(dir, "evals"))).toBe(false);
        expect(existsSync(join(dir, ".peer-ai", "review-report.schema.json"))).toBe(true);
        expect(prompt).toContain("Review Courier's web app and API for security problems.");
        mkdirSync(join(dir, ".peer-ai", "reports", "project"), { recursive: true });
        writeFileSync(
          join(dir, ".peer-ai", "reports", "project", "security-review.json"),
          JSON.stringify(report([finding(d1?.file ?? "", d1?.line ?? 0)])),
        );
        writeFileSync(join(dir, ".peer-ai", "reports", "project", "broken.json"), "{");
        expect(existsSync(join(dir, ".claude", "skills", "peer-ai-security-review"))).toBe(false);
        return Promise.resolve({ seconds: 12, turns: 30, costUsd: 1.5 });
      },
      undefined,
      baseline,
    );
    expect(result.score.expected.find(({ defect }) => defect.id === "D1")?.foundBy).toHaveLength(1);
    expect(result.collected.invalid.map((bad) => bad.path)).toEqual([".peer-ai/reports/project/broken.json"]);

    const printed = formatRun(sheet, "claude-code", result, 1, 1).join("\n");
    expect(printed).toMatch(
      /^courier · security-review · Claude Code · without the skill · run 1 of 1\n\nFound 1 of 14 problems on the answer sheet:/,
    );
    expect(printed).toContain(
      "\n  D3   critical services/api/app/routes/parcels.py:55  The status filter is pasted into SQL",
    );
    expect(printed).toContain("Invalid report .peer-ai/reports/project/broken.json:");
    expect(printed).toContain("30 turns · 12 s · $1.50");
    expect(printed).toMatch(/Not ready yet: it missed 2 critical problems; it missed 8 high problems/);
  });

  it("installs the skill, asks in plain words, and notices whether the tool used it", async () => {
    const sheet = loadSheet("courier");
    let log = "";
    const result = await evaluate(
      sheet,
      "security-review",
      "codex",
      (_tool, dir, prompt, logPath, model) => {
        made.push(dir, logPath);
        expect(prompt).toBe("Review Courier's web app and API for security problems.");
        expect(model).toBe("fast-model");
        expect(existsSync(join(dir, ".peer-ai", "review-report.schema.json"))).toBe(false);
        for (const home of [".claude", ".agents"]) {
          expect(existsSync(join(dir, home, "skills", "peer-ai-security-review", "references", "rules.md"))).toBe(true);
        }
        mkdirSync(join(dir, ".peer-ai", "reports", "project"), { recursive: true });
        const covered = report([]);
        covered.coverage = [
          { rule: "SEC-01", status: "pass", evidence: "orders.ts:43" },
          { rule: "SEC-07", status: "pass", evidence: "orders.ts:12" },
        ];
        writeFileSync(join(dir, ".peer-ai", "reports", "project", "security-review.json"), JSON.stringify(covered));
        log = "exec sed -n 1,200p .agents/skills/peer-ai-security-review/SKILL.md";
        writeFileSync(logPath, log);
        return Promise.resolve({ seconds: 5 });
      },
      undefined,
      { model: "fast-model" },
    );
    expect(result).toMatchObject({ baseline: false, model: "fast-model", skillUsed: true });
    expect(result.coverage).toEqual({ covered: 2, of: skillRuleIds("security-review").length });
    expect(formatRun(sheet, "codex", result, 1, 1).join("\n")).toMatch(
      /^courier · security-review · Codex \(fast-model\) · with the skill · run 1 of 1/,
    );
    expect(usedSkill('{"skills":["peer-ai-security-review"]}', "security-review")).toBe(false);
    expect(usedSkill('{"name":"Skill","input":{"skill":"peer-ai-security-review"}}', "security-review")).toBe(true);
    expect(log).toContain("SKILL.md");
  });

  it("refuses to run with a skill that doesn't exist yet", async () => {
    await expect(
      evaluate(loadSheet("courier"), "contract-check", "claude-code", () => Promise.resolve({ seconds: 0 })),
    ).rejects.toThrow(/There's no contract-check skill yet. Run with --baseline/);
  });

  it("adds a result to the end of the table under its heading", () => {
    const dir = mkdtempSync(join(tmpdir(), "peer-ai-evals-"));
    made.push(dir);
    const readme = join(dir, "README.md");
    const table = "| Date | Result |\n|------|--------|\n| 2026-10-04 | Ready |\n";
    writeFileSync(readme, `# Evals\n\n${REVIEW_RESULTS}\n\n${table}\n${DOCUMENT_RESULTS}\n\nNewest last.\n\n${table}`);
    appendResult(readme, REVIEW_RESULTS, "| 2026-10-05 | Not ready |");
    appendResult(readme, DOCUMENT_RESULTS, "| 2026-10-06 | Ready |");
    expect(readFileSync(readme, "utf8")).toBe(
      `# Evals\n\n${REVIEW_RESULTS}\n\n${table}| 2026-10-05 | Not ready |\n\n${DOCUMENT_RESULTS}\n\nNewest last.\n\n${table}| 2026-10-06 | Ready |\n`,
    );
    expect(() => {
      appendResult(readme, "## Other results", "| 2026-10-05 | Ready |");
    }).toThrow(/has no table under "## Other results"/);
  });

  it("keeps the README's result tables where the runner writes to them", () => {
    const readme = readFileSync(new URL("../evals/README.md", import.meta.url), "utf8").split("\n");
    for (const heading of [REVIEW_RESULTS, DOCUMENT_RESULTS]) expect(readme).toContain(heading);
  });

  it("asks only for reviews the answer sheet has a prompt for", () => {
    expect(() => evalPrompt(SHEET, "design-review")).toThrow(/has no prompt for design-review/);
    expect(collectReports("/nowhere")).toEqual({ reports: [], invalid: [] });
  });
});

describe("marking a document", () => {
  const scenario = {
    path: "docs/requirements.md",
    points: [
      { id: "R1", point: "Names who it's for.", must: true },
      { id: "R2", point: "Gives acceptance criteria." },
      { id: "R3", point: "Puts video calls out of scope." },
      { id: "R4", point: "Asks how many orders to expect." },
      { id: "R5", point: "Says where it came from." },
    ],
  };
  const grades = (met: string[]) =>
    scenario.points.map(({ id }) => ({ id, met: met.includes(id), quote: `${id} quote` }));

  it("is ready when it's accepted, makes every point it must, and 80% of all of them", () => {
    const marked = scoreDocument(
      "requirements-analysis",
      scenario,
      true,
      { ready: true, problems: [] },
      grades(["R1", "R2", "R3", "R4"]),
    );
    expect(marked).toMatchObject({ ready: true, reasons: [], graded: true });
    expect(marked.points[0]).toEqual({
      id: "R1",
      point: "Names who it's for.",
      must: true,
      met: true,
      quote: "R1 quote",
    });
  });

  it("says why it isn't ready", () => {
    expect(
      scoreDocument(
        "requirements-analysis",
        scenario,
        true,
        { ready: false, problems: ["Add Scope."] },
        grades(["R2", "R3"]),
      ).reasons,
    ).toEqual([
      "check_document didn't accept it",
      "it missed 1 of the 1 points it must make",
      "it made 2 of 5 points, under 80%",
    ]);
    expect(scoreDocument("requirements-analysis", scenario, false, undefined, undefined).reasons).toEqual([
      "it wrote no document at docs/requirements.md",
    ]);
    expect(
      scoreDocument("requirements-analysis", scenario, true, { ready: true, problems: [] }, undefined).reasons[0],
    ).toBe("the grader gave no valid grades");
  });

  it("runs the skill on a copy, checks the document, and has another run grade it", async () => {
    const sheet = loadSheet("refill");
    const result = await evaluateDocument(
      sheet,
      "requirements-analysis",
      "codex",
      (_tool, dir, prompt, logPath) => {
        made.push(dir, logPath);
        expect(prompt).toContain("Write the requirements for Refill from our founder's brief");
        expect(
          existsSync(join(dir, ".agents", "skills", "peer-ai-requirements-analysis", "assets", "requirements.md")),
        ).toBe(true);
        mkdirSync(join(dir, "docs"), { recursive: true });
        writeFileSync(
          join(dir, "docs", "requirements.md"),
          "# Requirements: Refill\n\n## Summary\n\nMedicine at home.\n",
        );
        writeFileSync(logPath, "exec cat .agents/skills/peer-ai-requirements-analysis/SKILL.md");
        return Promise.resolve({ seconds: 7 });
      },
      (tool, dir, prompt, logPath) => {
        made.push(dir, logPath);
        expect([tool, prompt]).toEqual(["codex", GRADE_PROMPT]);
        expect(readFileSync(join(dir, "document.md"), "utf8")).toContain("Medicine at home.");
        const points = JSON.parse(readFileSync(join(dir, "points.json"), "utf8")) as { id: string }[];
        const graded = points.map(({ id }) => ({
          id,
          met: id !== "F3",
          quote: id === "F3" ? "Nothing about video calls." : "It says so.",
        }));
        writeFileSync(join(dir, "grades.json"), JSON.stringify(graded));
        return Promise.resolve();
      },
      { tool: "codex" },
      join(tmpdir(), `peer-ai-eval-document-test-${String(Date.now())}`),
    );
    expect(result.skillUsed).toBe(true);
    expect(result.score).toMatchObject({ written: true, graded: true, ready: false });
    expect(result.score.check?.ready).toBe(false);
    expect(result.score.reasons).toEqual([
      "check_document didn't accept it",
      "it missed 1 of the 6 points it must make",
    ]);

    const printed = formatDocumentRun(sheet, "codex", result, 1, 1).join("\n");
    expect(printed).toMatch(
      /^refill · requirements-analysis · Codex · with the skill · run 1 of 1\n\nMade 12 of 13 points, and 5 of the 6 it must make\. Graded by Codex; check the quotes:/,
    );
    expect(printed).toContain(
      '  ✗ F3   must Puts video calls with a doctor out of scope, for later. "Nothing about video calls."',
    );
    expect(printed).toContain(
      "check_document refused it: Add the missing parts, each under its own heading: People and their problems",
    );
  });

  it("grades an earlier run's document again from its copy", async () => {
    const sheet = loadSheet("refill");
    const dir = mkdtempSync(join(tmpdir(), "peer-ai-eval-regrade-"));
    made.push(dir, `${dir}-grades`, `${dir}-grades.log`);
    mkdirSync(join(dir, ".agents", "skills", "peer-ai-requirements-analysis"), { recursive: true });
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "requirements.md"), "# Requirements: Refill\n");
    writeFileSync(`${dir}.log`, "exec cat .agents/skills/peer-ai-requirements-analysis/SKILL.md");
    made.push(`${dir}.log`);
    const result = await regradeDocument(
      sheet,
      "requirements-analysis",
      dir,
      (_tool, gradeDir) => {
        writeFileSync(join(gradeDir, "grades.json"), "not json");
        return Promise.resolve();
      },
      { tool: "claude-code", model: "strong-model" },
    );
    expect(result).toMatchObject({ baseline: false, skillUsed: true, regraded: true });
    expect(result.score).toMatchObject({ written: true, graded: false });
    const printed = formatDocumentRun(sheet, "codex", result, 1, 1).join("\n");
    expect(printed).toContain("Graded by Claude Code (strong-model)");
    expect(printed).toContain(`Graded again from the copy in ${dir}`);
  });

  it("notices when the run leaves the document as it was", async () => {
    const result = await evaluateDocument(
      loadSheet("courier"),
      "requirements-analysis",
      "codex",
      (_tool, dir, _prompt, logPath) => {
        made.push(dir, logPath);
        return Promise.resolve({ seconds: 1 });
      },
      () => Promise.reject(new Error("nothing to grade")),
      { tool: "codex" },
      join(tmpdir(), `peer-ai-eval-document-test-${String(Date.now())}`),
      { baseline: true },
    );
    expect(result.score).toMatchObject({ written: false, graded: false, ready: false });
    expect(evalPrompt(loadSheet("courier"), "requirements-analysis", true)).not.toContain("review-report.schema.json");
  });
});
