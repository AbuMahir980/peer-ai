import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { VERSION } from "./package-info.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { checkVersion, compareVersions, pinnedVersion } from "./versions.ts";
import { nextWork } from "./work.ts";

afterEach(cleanUp);

const mcp = (version: string) =>
  JSON.stringify({ mcpServers: { "peer-ai": { command: "npx", args: ["-y", `peer-ai@${version}`, "mcp"] } } });

describe("versions that drift (RFC 0011)", () => {
  it("are ordered as semantic versioning orders them", () => {
    const sorted = ["1.0.1", "1.0.0", "1.0.0-next.10", "1.0.0-next.3", "0.9.0"].sort(compareVersions);
    expect(sorted).toEqual(["0.9.0", "1.0.0-next.3", "1.0.0-next.10", "1.0.0", "1.0.1"]);
    expect(compareVersions("1.0.0-next.4", "1.0.0-next.4")).toBe(0);
  });

  it("are read from package.json, what's installed for a range, or what render pinned", () => {
    expect(pinnedVersion(project({ ".mcp.json": mcp("1.0.0-next.4") }))).toEqual({
      version: "1.0.0-next.4",
      from: ".mcp.json",
    });
    const exact = project({
      "package.json": JSON.stringify({ devDependencies: { "peer-ai": "1.0.0-next.5" } }),
      ".mcp.json": mcp("1.0.0-next.4"),
    });
    expect(pinnedVersion(exact)).toEqual({ version: "1.0.0-next.5", from: "package.json" });
    const range = project({
      "package.json": JSON.stringify({ devDependencies: { "peer-ai": "^1.0.0-next.4" } }),
      "node_modules/peer-ai/package.json": JSON.stringify({ version: "1.0.0-next.6" }),
    });
    expect(pinnedVersion(range)).toEqual({ version: "1.0.0-next.6", from: "node_modules" });
    expect(pinnedVersion(project({}))).toBeUndefined();
  });

  it("tell an AI tool still on the old version to reconnect", () => {
    const root = project({ ".mcp.json": mcp("1.0.0-next.4") });
    expect(checkVersion(root, "1.0.0-next.4")).toMatchObject({ status: "ok" });
    expect(checkVersion(root, "1.0.0-next.3")).toEqual({
      id: "version",
      status: "warn",
      message: "This is Peer AI 1.0.0-next.3, and the project now uses 1.0.0-next.4 (.mcp.json).",
      fix: "Reconnect your AI tool to Peer AI, or restart it, so its tools and CI agree. From a terminal, run npx peer-ai@1.0.0-next.4.",
    });
  });

  it("say how to move a project behind the version running", () => {
    expect(checkVersion(project({ ".mcp.json": mcp("1.0.0-next.3") }), "1.0.0-next.4")).toEqual({
      id: "version",
      status: "warn",
      message: "This is Peer AI 1.0.0-next.4, but the project uses 1.0.0-next.3 (.mcp.json).",
      fix: "To move the project to 1.0.0-next.4, run npx --prefer-online peer-ai@1.0.0-next.4 render and commit what it changes. To stay on 1.0.0-next.3, run npx peer-ai@1.0.0-next.3.",
    });
    const installed = project({ "package.json": JSON.stringify({ devDependencies: { "peer-ai": "1.0.0-next.5" } }) });
    expect(checkVersion(installed, "1.0.0-next.4").fix).toBe(
      "Install the project's dependencies, then reconnect your AI tool to Peer AI, or restart it, so its tools and CI agree.",
    );
  });

  it("reach the AI tool through next_work", () => {
    const root = project({
      "peer-ai.config.json": JSON.stringify({
        version: 1,
        project: { name: "Repairs" },
        tracks: [{ id: "api", kind: "backend", status: "active" }],
      }),
      ".mcp.json": mcp("99.0.0"),
    });
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    expect(nextWork(root, config).setup?.problems).toContainEqual({
      check: "version",
      status: "warn",
      message: `This is Peer AI ${VERSION}, and the project now uses 99.0.0 (.mcp.json).`,
      fix: "Reconnect your AI tool to Peer AI, or restart it, so its tools and CI agree. From a terminal, run npx peer-ai@99.0.0.",
    });
  });
});
