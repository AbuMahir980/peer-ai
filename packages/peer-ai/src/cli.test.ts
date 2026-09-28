import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { main } from "./cli.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

async function run(argv: string[], cwd = project()) {
  const out = capture();
  const code = await main(argv, { cwd, out });
  return { code, text: out.text(), cwd };
}

describe("the peer-ai command", () => {
  it("prints help with no arguments or with --help", async () => {
    for (const argv of [[], ["--help"], ["-h"]]) {
      const { code, text } = await run(argv);
      expect(code).toBe(0);
      expect(text).toContain("peer-ai init");
    }
  });

  it("prints its version", async () => {
    const { code, text } = await run(["--version"]);
    expect(code).toBe(0);
    expect(text).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("rejects an unknown command", async () => {
    const { code, text } = await run(["deploy"]);
    expect(code).toBe(2);
    expect(text).toContain('Unknown command "deploy"');
  });

  it("rejects an unknown flag and a bad value", async () => {
    expect((await run(["init", "--yess"])).code).toBe(2);
    const { code, text } = await run(["init", "--yes", "--stage", "beta"]);
    expect(code).toBe(2);
    expect(text).toContain("--stage must be one of: prototype, mvp, production");
  });

  it("runs init with flags", async () => {
    const { code, cwd } = await run(["init", "-y", "--name", "Demo", "--tool", "codex", "--tool", "cursor"]);
    expect(code).toBe(0);
    expect(existsSync(join(cwd, "peer-ai.config.json"))).toBe(true);
  });
});
