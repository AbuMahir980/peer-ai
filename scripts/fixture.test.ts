import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { fixtures, localServer, prepareFixture } from "./fixture.ts";

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function prepared(name: string, options: { skills?: boolean } = {}): string {
  const target = prepareFixture(name, undefined, options);
  made.push(target);
  return target;
}

const peerAi = (cwd: string, ...args: string[]) =>
  execFileSync(process.execPath, [localServer().args[0] ?? "", ...args], { cwd, encoding: "utf8" });

describe("fixtures", () => {
  it.each(fixtures())("%s is rendered and assessed as committed, and a prepared copy passes check", (name) => {
    // The committed fixture is what render writes. A prepared copy differs on purpose: its
    // server entries start this checkout.
    expect(peerAi(join(fileURLToPath(new URL("../fixtures", import.meta.url)), name), "render", "--check")).toContain(
      "Everything is up to date.",
    );
    expect(peerAi(prepared(name), "check")).toMatch(/^Passed/m);
  });

  it("prepares a copy as its own git repository, with the server started from this checkout", () => {
    const target = prepared("split-bill");
    expect(JSON.parse(readFileSync(join(target, ".mcp.json"), "utf8"))).toEqual({
      mcpServers: { "peer-ai": localServer() },
    });
    // Without skills, the hook that would write them is taken out; with them, it starts this checkout.
    expect(readFileSync(join(target, ".claude/settings.json"), "utf8")).not.toContain("render --skills");
    // Nor do its instructions send the agent off to install them.
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).not.toContain("Peer AI's skills are named");
    const [cli = ""] = localServer().args;
    const withSkills = prepared("split-bill", { skills: true });
    expect(readFileSync(join(withSkills, ".claude/settings.json"), "utf8")).toContain(
      `"command": "${process.execPath} ${cli} render --skills --quiet"`,
    );
    expect(existsSync(join(withSkills, ".claude/skills/peer-ai-security-review/SKILL.md"))).toBe(true);
    expect(readFileSync(join(withSkills, "AGENTS.md"), "utf8")).toContain("Peer AI's skills are named");
    expect(execFileSync("git", ["log", "--oneline"], { cwd: target, encoding: "utf8" })).toMatch(
      /^[0-9a-f]+ The fixture as it starts\n$/,
    );
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: target, encoding: "utf8" })).toBe("");
  });

  it("refuses an unknown fixture and a folder that isn't empty", () => {
    expect(() => prepareFixture("nope")).toThrow(/There is no fixture "nope"/);
    const busy = mkdtempSync(join(tmpdir(), "peer-ai-busy-"));
    made.push(busy);
    writeFileSync(join(busy, "keep.txt"), "");
    expect(() => prepareFixture("split-bill", busy)).toThrow(/isn't empty/);
  });
});
