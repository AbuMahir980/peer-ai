import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { fixtures, localServer, prepareFixture } from "./fixture.ts";

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function prepared(name: string): string {
  const target = prepareFixture(name);
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
