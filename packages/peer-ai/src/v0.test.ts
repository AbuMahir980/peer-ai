import { afterEach, describe, expect, it } from "vitest";
import { cleanUp, project } from "./test-helpers.ts";
import {
  V0_FINGERPRINTS,
  branchPattern,
  convertPhaseConfig,
  convertSettings,
  fingerprint,
  joinLists,
  lineSide,
  modelName,
  phaseFile,
  readCopy,
  readPhaseConfig,
  readState,
  settingValue,
  splitInstructions,
  type Fingerprints,
  type Settings,
} from "./v0.ts";

afterEach(cleanUp);

const settings = (rows: Record<string, string>): Settings =>
  new Map(Object.entries(rows).map(([name, value]) => [name.toLowerCase(), { name, value }]));

describe("fingerprints", () => {
  it("ignore line endings and a byte-order mark, and nothing else", () => {
    expect(fingerprint("one\ntwo\n")).toBe(fingerprint("one\r\ntwo\r\n"));
    expect(fingerprint("one\ntwo\n")).toBe(fingerprint("\uFEFFone\ntwo\n"));
    expect(fingerprint("one\ntwo\n")).not.toBe(fingerprint("one\ntwo"));
    expect(fingerprint("one")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("ship for every v0 version, from the first copy to the v0.1.0 tag", () => {
    const commits = V0_FINGERPRINTS.versions.map((version) => version.commit);
    expect(commits).toContain("33051c5");
    expect(commits).toContain("790aa8a");
    expect(commits.at(-1)).toBe("88f1c81");
    expect(Object.keys(V0_FINGERPRINTS.files)).toContain("shared/rules/workflow-driver.md");
  });
});

describe("reading a copy", () => {
  const SETUP_JUNE = "# Setup\n\nAsk which tool.\n";
  const SETUP_SEPT = "# Setup\n\nAsk everything in one round.\n";
  const README = "# Peer AI\n";
  const DOCS = "# Feedback\n";
  const fingerprints: Fingerprints = {
    versions: [
      { commit: "aaaa111", date: "2026-06-15" },
      { commit: "bbbb222", date: "2026-09-07" },
      { commit: "cccc333", date: "2026-09-11" },
    ],
    files: {
      "shared/00-setup.md": { [fingerprint(SETUP_JUNE)]: [0], [fingerprint(SETUP_SEPT)]: [1, 2] },
      "README.md": { [fingerprint(README)]: [0, 1, 2] },
      "docs/peer-ai-feedback.md": { [fingerprint(DOCS)]: [2] },
    },
  };

  it("sorts v0's own files from the ones it understands and the project's own", () => {
    const root = project({
      "peer-ai/shared/00-setup.md": SETUP_SEPT,
      "peer-ai/README.md": README.replaceAll("\n", "\r\n"),
      "peer-ai/shared/rules/shared.md": "# Rules, edited\n",
      "peer-ai/phase-config.json": "{}",
      "peer-ai/notes.md": "the project's own",
    });
    const copy = readCopy(root, fingerprints);
    expect(copy.files).toEqual([
      { path: "README.md", kind: "unchanged" },
      { path: "notes.md", kind: "own" },
      { path: "phase-config.json", kind: "understood" },
      { path: "shared/00-setup.md", kind: "unchanged" },
      { path: "shared/rules/shared.md", kind: "own" },
    ]);
    // bbbb222 matches as much as cccc333 and lacks less of what it had.
    expect(copy.version).toEqual({ commit: "bbbb222", date: "2026-09-07" });
  });

  it("names the version that matches most, and trusts a pin over the files", () => {
    const june = project({ "peer-ai/shared/00-setup.md": SETUP_JUNE, "peer-ai/README.md": README });
    expect(readCopy(june, fingerprints).version?.commit).toBe("aaaa111");
    const pinned = project({
      "peer-ai/shared/00-setup.md": SETUP_JUNE,
      "peer-ai/.upstream": JSON.stringify({
        _note: "x",
        repo: "someone/peer-ai",
        commit: "cccc333",
        pulledOn: "2026-09-11",
      }),
    });
    const copy = readCopy(pinned, fingerprints);
    expect(copy.pin).toEqual({ commit: "cccc333", pulledOn: "2026-09-11" });
    expect(copy.version?.commit).toBe("cccc333");
    expect(copy.files.find((file) => file.path === ".upstream")?.kind).toBe("understood");
  });

  it("finds nothing without a copy", () => {
    expect(readCopy(project({}), fingerprints)).toEqual({ files: [] });
  });
});

describe("phase files", () => {
  it("map onto 1.0's activities and skills", () => {
    expect(phaseFile("shared/02-architect.md")).toEqual({ activity: "architect", skill: "architecture" });
    expect(phaseFile("frontend/01-spec-pages.md")).toEqual({
      activity: "specify",
      skill: "product-spec",
      side: "frontend",
    });
    expect(phaseFile("backend/01-spec-endpoints.md")).toEqual({
      activity: "contract",
      skill: "api-design",
      side: "backend",
    });
    expect(phaseFile("backend/02-rules.md")).toEqual({ activity: "standards", side: "backend" });
    expect(phaseFile("agents/security-audit-prompt.md")).toEqual({ activity: "verify", skill: "security-review" });
    expect(phaseFile("shared/08-dev-journal.md")).toEqual({});
    expect(phaseFile("shared/00-setup.md")).toEqual({});
  });
});

describe("the state file", () => {
  it("reads any version, with a byte-order mark and PowerShell's layout", () => {
    const text = `\uFEFF{\r\n    "currentPhase":  "build",\r\n    "currentStep":  4,\r\n    "phaseFile":  "peer-ai/frontend/03-build.md",\r\n    "ticket":  "PAN-7",\r\n    "ticketTitle":  "Pantry list",\r\n    "ticketsInProgress":  [ "PAN-7", { "id": "PAN-8" } ],\r\n    "ticketsRemaining":  [ "#12", 13 ],\r\n    "pendingAgents":  [],\r\n    "cycle":  "M2",\r\n    "notes":  "  "\r\n}`;
    const state = readState(text);
    expect(state).toEqual({
      ok: true,
      value: {
        position: { phase: "build", step: 4, phaseFile: "peer-ai/frontend/03-build.md", ticket: "PAN-7" },
        inProgress: ["PAN-7", "PAN-8"],
        remaining: ["#12", "13"],
        pendingAgents: [],
        tracks: {},
        cycle: "M2",
        ticketTitle: "Pantry list",
      },
    });
  });

  it("reads the per-part positions some copies added, and says when it can't read one", () => {
    const state = readState(
      JSON.stringify({
        currentPhase: "review-complete",
        tracks: { frontend: { currentPhase: "frontend-build", ticket: "PAN-3" }, backend: { currentPhase: "build" } },
      }),
    );
    expect(state.ok && state.value.tracks).toEqual({
      frontend: { phase: "frontend-build", ticket: "PAN-3" },
      backend: { phase: "build" },
    });
    expect(readState("{ nope")).toMatchObject({
      ok: false,
      error: expect.stringContaining("isn't valid JSON") as string,
    });
    expect(readState("[]")).toMatchObject({ ok: false });
  });
});

describe("instruction files", () => {
  const DRIVER = [
    "# Workflow Driver",
    "",
    "You are **always** inside the development workflow.",
    "",
    "## 0. Project settings",
    "",
    "| Setting | Value |",
    "|---------|-------|",
    "| **Verify command** | `npm run verify` — lint and tests |",
    "| **Issue tracker** | `[PLACEHOLDER: e.g. Linear]` |",
    "| **Questions for the designer** | `docs/open-items.md` |",
    "",
    "## 1. On every session start",
    "",
    "Read the state file.",
  ].join("\n");

  it("keep the project's text, and move v0's driver and copied sections out", () => {
    const text = [
      "# Pantry",
      "",
      "A shared shopping list.",
      "",
      "## 1. On every session start",
      "",
      "Read `.peer-ai-state.json`.",
      "",
      "### Details",
      "",
      "More.",
      "",
      "## 2. House rules",
      "",
      "```bash",
      "# Workflow Driver",
      "```",
      "",
      "---",
      "",
      DRIVER,
    ].join("\n");
    const split = splitInstructions(text);
    expect(split.kept).toBe(
      "# Pantry\n\nA shared shopping list.\n\n## 2. House rules\n\n```bash\n# Workflow Driver\n```\n",
    );
    expect(split.moved.map((section) => section.heading)).toEqual(["1. On every session start", "Workflow Driver"]);
    expect(split.moved[0]?.text).toBe(
      "## 1. On every session start\n\nRead `.peer-ai-state.json`.\n\n### Details\n\nMore.",
    );
    expect(split.moved[1]?.text).toBe(DRIVER);
    expect([...split.settings.values()]).toEqual([
      { name: "Verify command", value: "`npm run verify` — lint and tests" },
      { name: "Issue tracker", value: "`[PLACEHOLDER: e.g. Linear]`" },
      { name: "Questions for the designer", value: "`docs/open-items.md`" },
    ]);
  });

  it("change nothing in a file without v0's text", () => {
    const split = splitInstructions("# Pantry\n\n## The way we work\n\nSmall changes.\n");
    expect(split).toEqual({
      kept: "# Pantry\n\n## The way we work\n\nSmall changes.\n",
      moved: [],
      settings: new Map(),
    });
    expect(splitInstructions(DRIVER).kept).toBe("");
  });

  it("end the driver at the first section that isn't its own, so the project's next section stays", () => {
    const split = splitInstructions(`# Pantry\n\n${DRIVER}\n\n## Deployment\n\nShip on Fridays.\n`);
    expect(split.kept).toBe("# Pantry\n\n## Deployment\n\nShip on Fridays.\n");
    expect(split.moved.map((section) => section.heading)).toEqual(["Workflow Driver"]);
  });

  it("change the project's text only where a section was cut out", () => {
    const code = ["```python", "def a():", "    pass", "", "", "def b():", "    pass", "```"].join("\r\n");
    const text = [
      "Pantry",
      "------",
      "",
      code,
      "",
      "<!--",
      "## On every session start",
      "-->",
      "",
      "## On every session start",
      "",
      "Read the state.",
      "",
      "## House rules",
      "",
      "Small changes.",
      "",
    ].join("\r\n");
    const split = splitInstructions(text);
    expect(split.moved.map((section) => section.heading)).toEqual(["On every session start"]);
    expect(split.kept).toBe(
      [
        "Pantry",
        "------",
        "",
        code,
        "",
        "<!--",
        "## On every session start",
        "-->",
        "",
        "## House rules",
        "",
        "Small changes.",
        "",
      ].join("\r\n"),
    );
  });
});

describe("the Project settings table", () => {
  it("reads a value, and knows one that was never filled in", () => {
    expect(settingValue("`npm run verify` — lint and tests")).toBe("npm run verify");
    expect(settingValue("GitHub Issues")).toBe("GitHub Issues");
    expect(settingValue("`[PLACEHOLDER: e.g. PROJ]`")).toBeUndefined();
    expect(settingValue("none yet")).toBeUndefined();
    expect(settingValue("none — issues are `#N`")).toBeUndefined();
    expect(settingValue("**—**")).toBeUndefined();
  });

  it("turns v0's branch patterns into 1.0's", () => {
    expect(branchPattern("feature/PROJ-XX-short-description")).toBe("feature/{ticket}-{slug}");
    expect(branchPattern("feature/<short-description>")).toBe("feature/{slug}");
    expect(branchPattern("feat/<issue-number>-<summary>")).toBe("feat/{ticket}-{slug}");
    expect(branchPattern("main")).toBeUndefined();
  });

  it("become config keys, and what has no key is kept word for word", () => {
    const result = convertSettings(
      settings({
        "Verify command": "`npm run verify` — lint and tests",
        "Issue tracker": "GitHub Issues on `pantry-co/pantry`. No project board.",
        "Ticket prefix": "PAN-",
        Remote: "`origin`",
        "Design reference": "`docs/design/`",
        "Branch naming": "`feature/<short-description>` for build items",
        "Merge policy": "**Every change reaches `main` only through a pull request.**",
        "Model selector": "no",
        "Questions for the designer": "`docs/open-items.md`",
      }),
      (path) => path === "docs/design/",
    );
    expect(result.config).toEqual({
      commands: { verify: "npm run verify" },
      tracker: { kind: "github", project: "pantry-co/pantry", ticketPrefix: "PAN" },
      repo: { remote: "origin", branchNaming: "feature/{slug}", mergePolicy: "pull-request" },
      design: { status: "exists", reference: "docs/design/" },
    });
    expect(result.unplaced).toEqual([{ name: "Questions for the designer", value: "`docs/open-items.md`" }]);
    expect(result.converted.map((entry) => entry.to)).toEqual([
      "commands.verify",
      "tracker.kind",
      "tracker.project",
      "tracker.ticketPrefix",
      "repo.remote",
      "design.reference",
      "repo.branchNaming",
      "repo.mergePolicy",
    ]);
  });

  it("keeps a value it can't trust, such as a design link or a local merge it can't tell", () => {
    const result = convertSettings(
      settings({
        "Design reference": "https://design.example.com/pantry",
        "Merge policy": "local merge, solo project",
        "Ticket prefix": "whatever the board says",
      }),
      () => false,
    );
    expect(result.config).toEqual({ repo: { mergePolicy: "local-merge" } });
    expect(result.unplaced.map((entry) => entry.name)).toEqual(["Design reference", "Ticket prefix"]);
  });
});

describe("phase-config.json", () => {
  it("reads each phase's model and block, and refuses what isn't one", () => {
    const text = JSON.stringify({
      _note: "Project convention.",
      "shared/02-architect.md": { model: "> **Model: Model A.**", block: ["> One.", 3] },
      "frontend/03-build.md": { model: "> **Model: Model B** — implementation.", block: [] },
    });
    expect(readPhaseConfig(text)).toEqual({
      ok: true,
      value: [
        { file: "shared/02-architect.md", model: "Model A", block: ["> One."] },
        { file: "frontend/03-build.md", model: "Model B", block: [] },
      ],
    });
    expect(readPhaseConfig("[]")).toMatchObject({ ok: false });
    expect(modelName("> **Model: Model C (fast).**")).toBe("Model C");
  });

  it("joins a line that introduces a list with its items", () => {
    expect(
      joinLists(["**Review against, in this order:**", "- the standards", "- the addendum", "Then report."]),
    ).toEqual(["**Review against, in this order:** the standards; the addendum", "Then report."]);
    expect(joinLists(["- on its own", "Plain."])).toEqual(["on its own", "Plain."]);
  });

  it("become models, add-ons and notes, and a block the file has lost is a conflict", () => {
    const phases = {
      "shared/02-architect.md":
        "# Architect\n> **Model: Model A.**\n> **Skills to use here.** Inside this phase:\n> - `engineering:architecture` — options\n",
      "frontend/03-build.md": "# Build\n> Small commits.\n",
      "backend/03-build.md": "# Build\n> **Live since September.**\n",
      "frontend/04-review.md": "# Review\n> **Review against:**\n",
      "shared/05-rules-shared.md": "# Rules\n> The standards already exist.\n",
      "shared/01-understand.md": "# Understand\n> **No skill for this phase.** The brief is the source.\n",
    };
    const entries = [
      {
        file: "shared/02-architect.md",
        model: "Model A",
        block: ["> **Skills to use here.** Inside this phase:", "> - `engineering:architecture` — options", ">"],
      },
      { file: "frontend/03-build.md", model: "Model B", block: ["> Small commits."] },
      { file: "backend/03-build.md", model: "Model B", block: ["> **Dormant until v3.**"] },
      {
        file: "frontend/04-review.md",
        model: "Model A",
        block: ["> **Review against:**", "> - the standards", "> - `/code-review`"],
      },
      { file: "shared/05-rules-shared.md", model: "Model A", block: ["> The standards already exist."] },
      { file: "shared/00-setup.md", block: ["> The setup round is already answered."] },
      { file: "shared/01-understand.md", block: ["> **No skill for this phase.** The brief is the source."] },
    ];
    const result = convertPhaseConfig(entries, (file) => phases[file as keyof typeof phases]);
    expect(result.models).toEqual({ policy: "pinned", default: "Model A", byActivity: { build: "Model B" } });
    // Every line stays as a note, and an add-on is also an add-on, except v0's own wording: the
    // add-ons' header, and a line that only names an add-on and what it's for (#217).
    expect(result.capabilities).toEqual({
      architecture: { also: ["engineering:architecture"] },
      "implement-ticket": { notes: ["Frontend: Small commits."] },
      "code-review": { also: ["/code-review"], notes: ["Frontend: **Review against:** the standards; `/code-review`"] },
    });
    expect(result.activities).toEqual({ standards: { notes: ["The standards already exist."] } });
    expect(result.conflicts).toEqual([{ file: "backend/03-build.md", block: ["> **Dormant until v3.**"] }]);
    expect(result.dormant).toEqual([]);
    // A note that says there's no skill, where 1.0 has one, is a decision, not a note (#217).
    expect(result.unplaced).toEqual([
      { file: "shared/00-setup.md", text: "The setup round is already answered." },
      {
        file: "shared/01-understand.md",
        text: "Says there's no skill here, but 1.0 has peer-ai-requirements-analysis: **No skill for this phase.** The brief is the source.",
      },
    ]);
  });

  it("takes an add-on only from a list item that starts with one, and keeps the whole line", () => {
    const result = convertPhaseConfig(
      [
        {
          file: "frontend/05-test.md",
          block: [
            "> Use `node:test` for unit tests, never jest.",
            "> Every service exposes `/health`, unauthenticated.",
          ],
        },
      ],
      () => undefined,
    );
    expect(result.capabilities).toEqual({
      "test-strategy": {
        notes: [
          "Frontend: Use `node:test` for unit tests, never jest.",
          "Frontend: Every service exposes `/health`, unauthenticated.",
        ],
      },
    });
  });

  it("reads which side is dormant from the line's own words, and says when phases disagree on a model", () => {
    const result = convertPhaseConfig(
      [
        { file: "frontend/03-build.md", model: "Model A", block: ["> The backend is dormant until M3."] },
        { file: "backend/03-build.md", model: "Model B", block: ["> **Dormant until v3.**"] },
        { file: "shared/06-issues.md", model: "Model A", block: ["> **Dormant until v2.**"] },
      ],
      () => undefined,
    );
    expect(result.dormant).toEqual([
      { side: "backend", line: "The backend is dormant until M3.", file: "frontend/03-build.md" },
      { side: "backend", line: "**Dormant until v3.**", file: "backend/03-build.md" },
      { line: "**Dormant until v2.**", file: "shared/06-issues.md" },
    ]);
    expect(result.capabilities["implement-ticket"]?.notes).toEqual([
      "Frontend: The backend is dormant until M3.",
      "Backend: **Dormant until v3.**",
    ]);
    expect(result.models).toEqual({ policy: "pinned", default: "Model A" });
    expect(result.unplaced).toEqual([
      { file: "phase-config.json", text: "Phases for build name different models: Model A, Model B." },
    ]);
    expect(lineSide("The web app and the API")).toBeUndefined();
  });
});
