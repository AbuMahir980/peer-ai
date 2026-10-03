import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { VERSION } from "./package-info.ts";
import { README_END, README_START } from "./readme.ts";
import { runRender } from "./render.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const config = (extra: Record<string, unknown> = {}, project_: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    project: { name: "Shop", stage: "mvp", ...project_ },
    tools: ["claude-code"],
    tracks: [{ id: "web", kind: "web", status: "active" }],
    ...extra,
  });
const readme = (root: string) => readFileSync(join(root, "README.md"), "utf8");
const render = (root: string) => runRender({ cwd: root, check: false, quiet: true }, capture());

describe("the README section for people (RFC 0014)", () => {
  it("is written into the project's README, from the config, with the details folded away", () => {
    const root = project({
      "peer-ai.config.json": config({
        docs: { readme: true },
        commands: { verify: "make check", verifyCheck: "ci / check" },
        standards: {
          profiles: ["github-actions"],
          enforcement: "report",
          deferred: [{ rule: "GHA-03", until: "2026-11-02", reason: "After the launch.", decidedBy: "Ada Obi" }],
        },
      }),
      "README.md": "# Shop\n\nA shop.\n",
    });
    expect(render(root)).toBe(0);
    const text = readme(root);
    expect(text.startsWith("# Shop\n\nA shop.\n\n<!-- peer-ai:readme:start -->\n## How we work: Peer AI\n")).toBe(true);
    expect(text).toContain("Nobody needs to install anything. To see how the setup stands, run `npx peer-ai doctor`.");
    expect(text).toContain("<summary>The stage: mvp</summary>");
    expect(text).toContain(
      "- a passing verify on the branch's latest commit: CI's `ci / check` counts, or `make check` run locally;",
    );
    expect(text).toContain("Their tools run and report what they find without failing a build");
    expect(text).toContain("- GHA-03, until 2026-11-02: After the launch.");
    expect(text).toContain(`The project uses Peer AI ${VERSION}, pinned`);
    expect(text.trimEnd().endsWith(README_END)).toBe(true);
  });

  it("follows the config, and leaves the rest of the README as it is", () => {
    const root = project({
      "peer-ai.config.json": config({ docs: { readme: true } }),
      "README.md": "# Shop\n",
    });
    render(root);
    writeFileSync(join(root, "README.md"), `${readme(root)}\n## Licence\n\nMIT.\n`);
    writeFileSync(join(root, "peer-ai.config.json"), config({ docs: { readme: true } }, { stage: "production" }));
    render(root);
    const text = readme(root);
    expect(text).toContain("<summary>The stage: production</summary>");
    expect(text).toContain("## Licence\n\nMIT.\n");
    expect(text.split(README_START)).toHaveLength(2);
  });

  it("starts a README when there's none, and isn't written unless asked for", () => {
    const started = project({ "peer-ai.config.json": config({ docs: { readme: true } }) });
    render(started);
    expect(readme(started).startsWith(`# Shop\n\n${README_START}`)).toBe(true);
    const left = project({ "peer-ai.config.json": config(), "README.md": "# Shop\n" });
    render(left);
    expect(readme(left)).toBe("# Shop\n");
  });
});
