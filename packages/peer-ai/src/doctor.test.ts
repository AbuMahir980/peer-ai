import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { availableSkills } from "@peer-ai/skills";
import { afterEach, describe, expect, it } from "vitest";
import { runAssess } from "./assess.ts";
import { main } from "./cli.ts";
import type { Check } from "./checks.ts";
import { diagnose, runDoctor } from "./doctor.ts";
import { MIN_NODE_MAJOR } from "./package-info.ts";
import { runRender } from "./render.ts";
import { formatReport } from "./report.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");
const NODE = "24.3.0";
const json = (value: unknown) => JSON.stringify(value);
const web = json({ dependencies: { react: "19.0.0" } });

const config = (extra: Record<string, unknown> = {}) =>
  json({
    version: 1,
    project: { name: "Shop", stage: "mvp" },
    tools: ["claude-code"],
    tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
    ...extra,
  });

function assessed(files: Record<string, string>, options: { git?: boolean } = { git: true }): string {
  const root = project(files, options);
  runRender({ cwd: root, check: false }, capture());
  runAssess({ cwd: root, json: false, dryRun: false, now: NOW }, capture(), formatReport);
  return root;
}

const healthy = () =>
  assessed({ "peer-ai.config.json": config(), "CLAUDE.md": "# Shop", "apps/web/package.json": web });

const checksFor = (root: string, id: string): Check[] => diagnose(root, NODE).checks.filter((c) => c.id === id);
const statuses = (root: string) => Object.fromEntries(diagnose(root, NODE).checks.map((c) => [c.id, c.status]));

function writeWorkItem(root: string, file: string, content: unknown): void {
  mkdirSync(join(root, ".peer-ai/work"), { recursive: true });
  writeFileSync(join(root, ".peer-ai/work", file), typeof content === "string" ? content : json(content));
}

const workItem = {
  version: 1,
  id: "SHOP-1",
  title: "Checkout",
  kind: "feature",
  stage: "build",
  track: "web",
  next: "Write the cart test",
  updatedAt: NOW.toISOString(),
};

describe("doctor", () => {
  it("passes a project that is set up correctly", () => {
    const root = healthy();
    const diagnosis = diagnose(root, NODE);
    expect(diagnosis.checks.filter((check) => check.status !== "ok")).toEqual([]);
    expect(diagnosis).toMatchObject({ name: "Shop", ok: true });
    const out = capture();
    expect(runDoctor({ cwd: root, json: false, nodeVersion: NODE }, out)).toBe(0);
    expect(out.text()).toContain("✓ The project map from 2026-10-02 is up to date");
    expect(out.text()).toContain("Everything is set up correctly.");
  });

  it("fails without a config, and says what it couldn't check", () => {
    const root = project({}, { git: true });
    expect(checksFor(root, "config")).toEqual([
      { id: "config", status: "fail", message: "No peer-ai.config.json in this folder.", fix: "Run peer-ai init." },
    ]);
    expect(statuses(root)).toMatchObject({ tracks: "skip", references: "skip", tools: "skip", map: "warn" });
    expect(runDoctor({ cwd: root, json: false, nodeVersion: NODE }, capture())).toBe(1);
  });

  it("reports an invalid config with its errors", () => {
    const root = project({ "peer-ai.config.json": json({ version: 1, project: {}, tracks: [] }) });
    const [check] = checksFor(root, "config");
    expect(check?.status).toBe("fail");
    expect(check?.message).toMatch(/^peer-ai\.config\.json is not valid: .*project/);
  });

  it("fails on Node.js older than the package supports", () => {
    expect(MIN_NODE_MAJOR).toBe(24);
    expect(diagnose(healthy(), "22.12.0").checks[0]).toMatchObject({
      id: "node",
      status: "fail",
      fix: "Install Node.js 24 or later.",
    });
  });
});

describe("doctor on tracks and the files the config names", () => {
  it("finds a track whose folder is gone, and a part the config doesn't list", () => {
    const root = project({
      "peer-ai.config.json": config({
        tracks: [
          { id: "web", kind: "web", path: "apps/web", status: "active" },
          { id: "api", kind: "backend", path: "services/api", status: "active" },
          { id: "desktop", kind: "desktop", path: "apps/desktop", status: "dormant" },
          { id: "billing", kind: "backend", repo: "acme/billing", status: "external" },
        ],
      }),
      "apps/web/package.json": web,
      "apps/admin/package.json": web,
    });
    expect(checksFor(root, "tracks")).toEqual([
      {
        id: "tracks",
        status: "fail",
        message: 'Track "api" points to services/api, which doesn\'t exist.',
        fix: "Correct its path in peer-ai.config.json, or remove the track.",
      },
      {
        id: "tracks",
        status: "warn",
        message: "Found apps/admin (web), which isn't in the config.",
        fix: "Add it to tracks in peer-ai.config.json, or set the path of the track it belongs to.",
      },
    ]);
  });

  it("matches a track by its folder, and a track with no path only at the repository root", () => {
    const root = project({
      "peer-ai.config.json": config({
        tracks: [
          { id: "shop", kind: "web", status: "active" },
          { id: "apps", kind: "mobile", path: "./apps/", status: "frozen" },
        ],
      }),
      "package.json": web,
      "apps/buyer/package.json": json({ dependencies: { expo: "57.0.0" } }),
      "packages/ui/package.json": json({ name: "ui" }),
    });
    expect(checksFor(root, "tracks")).toEqual([
      {
        id: "tracks",
        status: "warn",
        message: "Found packages/ui (library), which isn't in the config.",
        fix: "Add it to tracks in peer-ai.config.json, or set the path of the track it belongs to.",
      },
    ]);
  });

  it("warns about files the config names that are missing, but not URLs, globs or places still to be made", () => {
    const root = project({
      "peer-ai.config.json": config({
        design: { status: "exists", reference: "https://design.example/shop" },
        apis: [
          { id: "shop-api", kind: "http", contract: { source: "openapi", location: "api/openapi.json" } },
          { id: "admin-api", kind: "http", contract: { source: "openapi", location: "/openapi.json" } },
        ],
        standards: { documents: [{ path: "docs/standards.md", role: "standard" }] },
        activities: { build: { inputs: ["docs/decisions/*.md"] } },
        docs: { dir: "docs/generated", backlog: "docs/backlog.md" },
      }),
      "apps/web/package.json": web,
      "docs/standards.md": "",
    });
    expect(checksFor(root, "references")).toEqual([
      {
        id: "references",
        status: "warn",
        message: 'apis "shop-api" contract points to api/openapi.json, which doesn\'t exist.',
        fix: "Create it, or correct the path in peer-ai.config.json.",
      },
      {
        id: "references",
        status: "warn",
        message:
          'apis "admin-api" contract is /openapi.json, which is neither a path in the repository nor a full URL.',
        fix: "Use a path relative to the project root, or a full URL starting with https://.",
      },
    ]);
  });

  it("warns about an AI tool set up in the repository but not in the config", () => {
    const withCursor = project({ "peer-ai.config.json": config(), "CLAUDE.md": "", ".cursor/": "" });
    expect(checksFor(withCursor, "tools")).toMatchObject([
      { status: "warn", message: "Set up in this repository, but not listed in the config: cursor." },
    ]);
    const noTools = project({ "peer-ai.config.json": config({ tools: undefined }) });
    expect(checksFor(noTools, "tools")).toMatchObject([{ status: "warn" }]);
    expect(checksFor(noTools, "tools")[0]?.message).toContain("No AI tools are listed");
  });
});

describe("doctor on what render writes", () => {
  it("warns when the AI tools' files no longer match the config", () => {
    const root = healthy();
    expect(checksFor(root, "render")).toMatchObject([{ status: "ok" }]);
    writeFileSync(join(root, "peer-ai.config.json"), config({ tools: ["claude-code", "cursor"] }));
    expect(checksFor(root, "render")).toEqual([
      {
        id: "render",
        status: "warn",
        message:
          "Out of date for the AI tools: AGENTS.md, .cursor/rules/peer-ai.mdc, .cursor/mcp.json, .cursor/environment.json.",
        fix: "Run peer-ai render.",
      },
    ]);
  });

  it("warns when the skills are missing, as in a fresh clone", () => {
    const root = healthy();
    rmSync(join(root, ".claude/skills"), { recursive: true });
    expect(checksFor(root, "render")).toEqual([
      {
        id: "render",
        status: "warn",
        message: `Out of date for the AI tools: ${availableSkills()
          .map((id) => `.claude/skills/peer-ai-${id}/`)
          .join(", ")}.`,
        fix: "Run peer-ai render.",
      },
    ]);
  });
});

describe("doctor on CI", () => {
  it("warns when the config says there is no CI but the repository has a pipeline", () => {
    const root = project({
      "peer-ai.config.json": config({ delivery: { ci: "none" } }),
      ".github/workflows/checks.yml": "on: push\n",
    });
    expect(checksFor(root, "delivery")).toEqual([
      {
        id: "delivery",
        status: "warn",
        message: "The config says there is no CI, but there is a pipeline in .github/workflows/.",
        fix: 'Set "delivery": { "ci": "existing", "pipeline": ".github/workflows/" } in peer-ai.config.json, so Peer AI extends it instead of adding another.',
      },
    ]);
    expect(checksFor(project({ "peer-ai.config.json": config() }), "delivery")).toMatchObject([
      { status: "ok", message: "No CI pipeline yet" },
    ]);
  });
});

describe("doctor on state", () => {
  it("asks for a map when there is none, and rejects a broken one", () => {
    const root = project({ "peer-ai.config.json": config(), "apps/web/package.json": web });
    expect(checksFor(root, "map")).toMatchObject([{ status: "warn", fix: "Run peer-ai assess." }]);
    mkdirSync(join(root, ".peer-ai"));
    writeFileSync(join(root, ".peer-ai/map.json"), "{ not json");
    expect(checksFor(root, "map")).toMatchObject([{ status: "fail" }]);
    writeFileSync(join(root, ".peer-ai/map.json"), json({ version: 1, items: {} }));
    expect(checksFor(root, "map")[0]?.message).toMatch(/^\.peer-ai\/map\.json is not valid: /);
  });

  it("notices when the project has moved on since the map was written", () => {
    const root = healthy();
    writeFileSync(join(root, "apps/web/cart.test.ts"), "");
    expect(checksFor(root, "map")).toEqual([
      {
        id: "map",
        status: "warn",
        message: "The project map from 2026-10-02 is out of date: tests (missing → present).",
        fix: "Run peer-ai assess.",
      },
    ]);
  });

  it("checks every work item, its file name and its track", () => {
    const root = healthy();
    writeWorkItem(root, "SHOP-1.json", workItem);
    expect(checksFor(root, "work-items")).toMatchObject([{ status: "ok", message: "1 work item, valid" }]);

    writeWorkItem(root, "SHOP-2.json", { ...workItem, id: "SHOP-3" });
    writeWorkItem(root, "SHOP-4.json", { ...workItem, id: "SHOP-4", track: "mobile" });
    writeWorkItem(root, "SHOP-5.json", { ...workItem, id: "SHOP-5", kind: "gap" });
    writeWorkItem(root, "SHOP-6.json", "{");
    expect(checksFor(root, "work-items").map((check) => [check.status, check.message])).toEqual([
      ["fail", '.peer-ai/work/SHOP-2.json has the id "SHOP-3", but a work item\'s file is named after its id'],
      ["fail", '.peer-ai/work/SHOP-4.json is for the track "mobile", which isn\'t in the config.'],
      ["fail", expect.stringMatching(/^\.peer-ai\/work\/SHOP-5\.json is not valid: .*gap/) as string],
      ["fail", expect.stringMatching(/^\.peer-ai\/work\/SHOP-6\.json is not valid JSON: /) as string],
    ]);
  });
});

describe("doctor on the repository", () => {
  it("warns when git ignores Peer AI's files, or there is no git repository", () => {
    const root = assessed({
      "peer-ai.config.json": config(),
      "CLAUDE.md": "",
      "apps/web/package.json": web,
      ".gitignore": ".peer-ai/\n",
    });
    expect(checksFor(root, "git")).toMatchObject([
      { status: "warn", message: expect.stringContaining("Git ignores .peer-ai/map.json, .peer-ai/work/") as string },
    ]);
    const noGit = assessed({ "peer-ai.config.json": config(), "apps/web/package.json": web }, {});
    expect(checksFor(noGit, "git")).toMatchObject([{ status: "warn", fix: "Run git init." }]);
  });

  it("lists every rule the project sets aside or changes, so none is switched off silently", () => {
    expect(checksFor(healthy(), "standards")).toEqual([
      { id: "standards", status: "ok", message: "No rules set aside or changed" },
    ]);
    const root = assessed({
      "peer-ai.config.json": config({
        standards: {
          exceptions: [
            {
              rule: "SEC-13",
              reason: "One server, so a shared rate limiter can wait",
              decidedBy: "Ada Obi",
              until: "2026-12-31",
            },
          ],
          overrides: { "REACT-03": { value: 200, reason: "The legacy screens are split up next quarter" } },
        },
      }),
      "CLAUDE.md": "# Shop",
      "apps/web/package.json": web,
    });
    expect(diagnose(root, NODE, NOW).checks.filter((check) => check.id === "standards")).toEqual([
      {
        id: "standards",
        status: "ok",
        message:
          "SEC-13 set aside: One server, so a shared rate limiter can wait (decided by Ada Obi, until 2026-12-31)",
      },
      {
        id: "standards",
        status: "ok",
        message: "REACT-03 changed to 200: The legacy screens are split up next quarter",
      },
    ]);
  });

  it("warns about an exception that has ended, a rule that doesn't exist, and a rule set aside twice", () => {
    const exception = (rule: string, until?: string) => ({
      rule,
      reason: "Decided at the launch review",
      decidedBy: "Ada Obi",
      ...(until === undefined ? {} : { until }),
    });
    const root = assessed({
      "peer-ai.config.json": config({
        standards: {
          exceptions: [
            exception("SEC-13", "2026-09-01"),
            exception("SEC-99"),
            exception("CODE-02"),
            exception("CODE-02"),
          ],
        },
      }),
      "CLAUDE.md": "# Shop",
      "apps/web/package.json": web,
    });
    const found = diagnose(root, NODE, NOW).checks.filter((check) => check.id === "standards");
    expect(found.map((check) => [check.status, check.message])).toEqual([
      ["warn", "The exception for SEC-13 ended on 2026-09-01, so the rule applies again."],
      ["warn", "SEC-99 isn't one of Peer AI's rules, so setting it aside or changing it does nothing."],
      ["ok", "CODE-02 set aside: Decided at the launch review (decided by Ada Obi)"],
      ["warn", "CODE-02 is set aside more than once."],
    ]);
  });

  it("points out a copy of the v0 playbook, only when it is one", () => {
    const legacy = project({ "peer-ai/shared/00-setup.md": "", "peer-ai/phase-config.json": "{}" });
    expect(checksFor(legacy, "legacy")).toMatchObject([
      { status: "warn", fix: expect.stringContaining("git rm -r peer-ai") as string },
    ]);
    expect(checksFor(project({ "peer-ai/notes.md": "" }), "legacy")).toEqual([]);
  });

  it("passes with warnings, prints JSON, and runs from the command line", async () => {
    const root = project({ "peer-ai.config.json": config(), "apps/web/package.json": web }, { git: true });
    const out = capture();
    expect(runDoctor({ cwd: root, json: true, nodeVersion: NODE }, out)).toBe(0);
    const printed = JSON.parse(out.text()) as { ok: boolean; checks: Check[] };
    expect(printed.ok).toBe(true);
    expect(printed.checks.some((check) => check.status === "warn")).toBe(true);

    const text = capture();
    expect(await main(["doctor"], { cwd: root, out: text })).toBe(0);
    expect(text.text()).toMatch(/No problems, and \d+ warnings?\./);
    expect(await main(["doctor", "--jsn"], { cwd: root, out: capture() })).toBe(2);
    expect(readFileSync(join(root, "peer-ai.config.json"), "utf8")).toBe(config());
  });
});

describe("doctor on stack profiles", () => {
  const typed = (stage: string, profiles: string[], extra: Record<string, unknown> = {}) =>
    json({
      version: 1,
      project: { name: "Shop", stage },
      tools: ["claude-code"],
      tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active", stack: ["typescript", "react"] }],
      standards: { profiles, ...extra },
    });
  const peerAiEslint = 'import peerAi from "@peer-ai/eslint-config";\nexport default [...peerAi()];\n';
  const strict = json({ compilerOptions: { strict: true } });

  it("warns about a listed profile Peer AI has no rules for yet", () => {
    const root = project({ "peer-ai.config.json": typed("mvp", ["typescript", "vue"]) });
    expect(checksFor(root, "profiles")).toMatchObject([
      { status: "warn", message: "Peer AI has no rules yet for vue, so that profile adds nothing for now." },
    ]);
  });

  it("says nothing enforces the automatic rules without Peer AI's ESLint settings: a warning, and a failure at production", () => {
    const files = { "apps/web/tsconfig.json": strict };
    const mvp = project({ ...files, "peer-ai.config.json": typed("mvp", ["typescript"]) });
    expect(checksFor(mvp, "enforcers")).toMatchObject([
      {
        status: "warn",
        message: expect.stringMatching(/^There's no ESLint config, so nothing enforces TS-02, TS-03/) as string,
      },
      { status: "ok", message: "apps/web/tsconfig.json sets strict to true (TS-01)" },
    ]);
    const own = project({
      ...files,
      "peer-ai.config.json": typed("production", ["typescript"]),
      "eslint.config.js": "export default [];\n",
    });
    expect(checksFor(own, "enforcers")[0]).toMatchObject({
      status: "fail",
      message: expect.stringContaining("eslint.config.js doesn't use Peer AI's settings") as string,
    });
    const linked = project({
      ...files,
      "peer-ai.config.json": typed("mvp", ["typescript"]),
      "eslint.config.js": peerAiEslint,
    });
    expect(checksFor(linked, "enforcers")[0]).toEqual({
      id: "enforcers",
      status: "ok",
      message: "eslint.config.js uses Peer AI's settings for 8 rules",
    });
  });

  it("checks each TypeScript part's tsconfig says what the compiler rules need", () => {
    const loose = project({
      "peer-ai.config.json": typed("mvp", ["typescript"]),
      "eslint.config.js": peerAiEslint,
      "tsconfig.json": json({ compilerOptions: { strict: false } }),
    });
    expect(checksFor(loose, "enforcers")[1]).toMatchObject({
      status: "warn",
      message: 'tsconfig.json sets "strict" to false, but TS-01 needs true.',
    });
    const none = project({ "peer-ai.config.json": typed("mvp", ["typescript"]), "eslint.config.js": peerAiEslint });
    expect(checksFor(none, "enforcers")[1]).toMatchObject({
      status: "warn",
      message: "web has no tsconfig.json, so the compiler doesn't enforce TS-01.",
    });
  });

  it("checks the ESLint config nearest each part, as ESLint finds it", () => {
    const root = project({
      "peer-ai.config.json": typed("production", ["typescript"]),
      "apps/web/eslint.config.js": peerAiEslint,
      "apps/web/tsconfig.json": strict,
    });
    expect(checksFor(root, "enforcers")[0]).toEqual({
      id: "enforcers",
      status: "ok",
      message: "apps/web/eslint.config.js uses Peer AI's settings for 8 rules",
    });
  });

  it("reads a tsconfig as TypeScript does: comments, and the files a solution tsconfig references", () => {
    const vite = project({
      "peer-ai.config.json": typed("production", ["typescript"]),
      "eslint.config.js": peerAiEslint,
      "apps/web/tsconfig.json": json({
        files: [],
        references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
      }),
      "apps/web/tsconfig.app.json": '{\n  // "strict": false,\n  "compilerOptions": { "strict": true, },\n}\n',
      "apps/web/tsconfig.node.json": json({ compilerOptions: { module: "nodenext" } }),
    });
    expect(checksFor(vite, "enforcers").slice(1)).toMatchObject([
      { status: "ok", message: "apps/web/tsconfig.app.json sets strict to true (TS-01)" },
      { status: "fail", message: 'apps/web/tsconfig.node.json doesn\'t say "strict": true, which TS-01 needs.' },
    ]);
  });

  describe("Ruff", () => {
    const pythonConfig = (tracks: unknown[]) =>
      json({
        version: 1,
        project: { name: "Repairs", stage: "production" },
        tools: ["codex"],
        tracks,
        standards: { profiles: ["python"] },
      });
    const apiTrack = { id: "api", kind: "backend", path: "services/api", status: "active", stack: ["python"] };
    /** A project with Peer AI's Ruff file as render writes it, and these files. */
    const api = (files: Record<string, string>, tracks: unknown[] = [apiTrack]) => {
      const root = project({ "peer-ai.config.json": pythonConfig(tracks), ...files });
      runRender({ cwd: root, check: false }, capture());
      return root;
    };
    const extendsPeerAi = 'extend = "../../.peer-ai/enforce/ruff.toml"\n';

    it("passes settings that extend Peer AI's, directly or through a shared base", () => {
      expect(checksFor(api({ "services/api/ruff.toml": extendsPeerAi }), "enforcers")).toEqual([
        {
          id: "enforcers",
          status: "ok",
          message: "services/api/ruff.toml extends Peer AI's Ruff settings for 12 rules",
        },
      ]);
      const chained = api({
        "services/api/ruff.toml": 'extend = "../../config/ruff-base.toml"\n',
        "config/ruff-base.toml": 'extend = "../.peer-ai/enforce/ruff.toml"\nline-length = 100\n',
      });
      expect(checksFor(chained, "enforcers")[0]).toMatchObject({ status: "ok" });
    });

    it("says where to add the extend, at the end of an existing chain", () => {
      expect(checksFor(api({}), "enforcers")).toMatchObject([
        {
          status: "fail",
          message: expect.stringMatching(
            /^There are no Ruff settings for services\/api, so nothing enforces PY-01/,
          ) as string,
          fix: 'Add [tool.ruff] to services/api/pyproject.toml, with extend = "../../.peer-ai/enforce/ruff.toml".',
        },
      ]);
      const shared = api({
        "pyproject.toml": '[tool.ruff]\nextend = "config/org.toml"\n',
        "config/org.toml": "line-length = 100\n",
      });
      expect(checksFor(shared, "enforcers")[0]).toMatchObject({
        status: "fail",
        fix: 'pyproject.toml extends config/org.toml, which extends nothing further. In config/org.toml add extend = "../.peer-ai/enforce/ruff.toml". Ruff allows one extend in each file.',
      });
    });

    it("finds a pyproject whose only Ruff table is [tool.ruff.lint], as Ruff does", () => {
      const nearer = api({
        "pyproject.toml": '[tool.ruff]\nextend = ".peer-ai/enforce/ruff.toml"\n',
        "services/api/pyproject.toml": '[tool.ruff.lint]\nextend-select = ["B"]\n',
      });
      expect(checksFor(nearer, "enforcers")[0]).toMatchObject({
        status: "fail",
        message: expect.stringContaining(
          "services/api/pyproject.toml doesn't extend Peer AI's Ruff settings",
        ) as string,
      });
    });

    it("fails a select, which replaces Peer AI's rules, and an ignore that drops them", () => {
      const selecting = api({ "services/api/ruff.toml": `${extendsPeerAi}[lint]\nselect = ["E", "F"]\n` });
      expect(checksFor(selecting, "enforcers")[0]).toMatchObject({
        status: "fail",
        fix: "In services/api/ruff.toml, rename select to extend-select.",
      });
      const ignoring = api({ "services/api/ruff.toml": `${extendsPeerAi}[lint]\nextend-ignore = ["S"]\n` });
      expect(checksFor(ignoring, "enforcers")[0]).toMatchObject({
        status: "fail",
        message: expect.stringContaining(
          "ignore the codes of PY-03, PY-06, PY-07, PY-08, PY-09, PY-12, PY-13",
        ) as string,
      });
    });

    it("reports each part without settings, and Peer AI's file when it's out of date", () => {
      const worker = { ...apiTrack, id: "worker", path: "services/worker" };
      const two = api({}, [apiTrack, worker]);
      expect(checksFor(two, "enforcers").map((check) => check.message.split(",")[0])).toEqual([
        "There are no Ruff settings for services/api",
        "There are no Ruff settings for services/worker",
      ]);
      const stale = api({ "services/api/ruff.toml": extendsPeerAi });
      writeFileSync(join(stale, ".peer-ai/enforce/ruff.toml"), "[lint]\n");
      expect(checksFor(stale, "enforcers")[0]).toMatchObject({
        status: "fail",
        message: ".peer-ai/enforce/ruff.toml is out of date with the config.",
      });
    });
  });

  it("checks the pipeline's workflow is there, as render wrote it, and up to date", () => {
    const pipeline = (stage: string) =>
      json({
        version: 1,
        project: { name: "Repairs", stage },
        tools: ["codex"],
        tracks: [{ id: "app", kind: "web", status: "active" }],
        repo: { host: "github" },
        standards: { profiles: ["github-actions"] },
      });
    const missing = project({ "peer-ai.config.json": pipeline("production") });
    expect(checksFor(missing, "enforcers")).toMatchObject([
      { status: "fail", message: expect.stringContaining("peer-ai-security.yml isn't there") as string },
    ]);
    const rendered = project({ "peer-ai.config.json": pipeline("mvp") });
    runRender({ cwd: rendered, check: false }, capture());
    expect(checksFor(rendered, "enforcers")).toMatchObject([
      {
        status: "ok",
        message: expect.stringMatching(/runs 5 checks: GHA-01, GHA-02, GHA-03, GHA-04, GHA-05$/) as string,
      },
    ]);
    const path = join(rendered, ".github/workflows/peer-ai-security.yml");
    writeFileSync(path, readFileSync(path, "utf8").replace("ubuntu-latest", "ubuntu-24.04"));
    expect(checksFor(rendered, "enforcers")).toMatchObject([
      { status: "warn", message: expect.stringContaining("was changed by hand") as string },
    ]);
  });

  it("warns about an override for a rule with no value to change", () => {
    const root = project({
      "peer-ai.config.json": typed("mvp", ["typescript"], {
        overrides: {
          "TS-02": { value: 1, reason: "Tried to change it" },
          "CODE-07": { value: 1, reason: "Tried to change it" },
          "TS-06": { value: 4, reason: "The booking rules nest deeper" },
          "TS-07": { value: "80", reason: "Written as text" },
        },
      }),
    });
    expect(checksFor(root, "standards")).toMatchObject([
      { status: "warn", message: "TS-02 has no value to change, so the override does nothing." },
      { status: "warn", message: "CODE-07 has no value to change, so the override does nothing." },
      { status: "ok", message: "TS-06 changed to 4: The booking rules nest deeper" },
      {
        status: "warn",
        message: 'TS-07\'s value is a whole number of 0 or more, such as 60, so "80" is ignored and the default stays.',
      },
    ]);
  });
});
