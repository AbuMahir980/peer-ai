import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanUp, project } from "./test-helpers.ts";
import { checkUpdates, latestRelease } from "./updates.ts";

afterEach(cleanUp);
beforeEach(() => {
  vi.stubEnv("PEER_AI_UPDATE_CHECK", "");
  return () => vi.unstubAllEnvs();
});

const NOW = new Date("2026-10-03T09:00:00Z");
const LATER = new Date("2026-10-04T09:30:00Z");
const config: PeerAiConfig = {
  version: 1,
  project: { name: "Shop" },
  tracks: [{ id: "web", kind: "web", status: "active" }],
};
const pinned = (version: string) =>
  project({
    ".mcp.json": JSON.stringify({
      mcpServers: { "peer-ai": { command: "npx", args: ["-y", `peer-ai@${version}`, "mcp"] } },
    }),
  });

/** npm, answering with a version, counting how often it's asked. */
function npm(answer: string | undefined) {
  const ask = vi.fn(() => answer);
  return { ask, cache: join(project({}), "cache") };
}

describe("a newer release (RFC 0014)", () => {
  it("is said with what changed and how to update, and never when the project is current", () => {
    const { ask, cache } = npm("1.0.0-next.12");
    expect(checkUpdates(pinned("1.0.0-next.9"), config, NOW, { ask, cache, ci: false })).toEqual([
      {
        id: "updates",
        status: "warn",
        message: "Peer AI 1.0.0-next.12 is out, and the project uses 1.0.0-next.9.",
        fix: 'See what changed at https://github.com/AbuMahir980/peer-ai/releases, then update on a branch: npx --prefer-online peer-ai@latest render. To stay on 1.0.0-next.9, set "updates": { "notify": false } in peer-ai.config.json.',
      },
    ]);
    expect(checkUpdates(pinned("1.0.0-next.12"), config, NOW, { ask, cache, ci: false })).toEqual([
      { id: "updates", status: "ok", message: "Peer AI 1.0.0-next.12 is the latest release" },
    ]);
  });

  it("asks npm at most once a day, offline too, and says nothing that fails", () => {
    const online = npm("1.0.0-next.12");
    latestRelease(NOW, online);
    latestRelease(new Date("2026-10-03T20:00:00Z"), online);
    expect(online.ask).toHaveBeenCalledTimes(1);
    latestRelease(LATER, online);
    expect(online.ask).toHaveBeenCalledTimes(2);

    const offline = npm(undefined);
    expect(checkUpdates(pinned("1.0.0-next.9"), config, NOW, { ...offline, ci: false })).toEqual([
      {
        id: "updates",
        status: "skip",
        message: "npm couldn't be asked for the latest release; it's asked again tomorrow",
      },
    ]);
    checkUpdates(pinned("1.0.0-next.9"), config, NOW, { ...offline, ci: false });
    expect(offline.ask).toHaveBeenCalledTimes(1);
  });

  it("isn't asked about in CI, when the project says not to, or in tests", () => {
    const { ask, cache } = npm("1.0.0-next.12");
    const root = pinned("1.0.0-next.9");
    expect(checkUpdates(root, config, NOW, { ask, cache, ci: true })).toEqual([
      { id: "updates", status: "skip", message: "Newer releases aren't checked in CI" },
    ]);
    expect(checkUpdates(root, { ...config, updates: { notify: false } }, NOW, { ask, cache, ci: false })).toEqual([
      { id: "updates", status: "skip", message: "Not checking for newer releases: updates.notify is false" },
    ]);
    vi.stubEnv("PEER_AI_UPDATE_CHECK", "off");
    expect(checkUpdates(root, config, NOW, { ask, cache, ci: false })).toEqual([]);
    expect(ask).not.toHaveBeenCalled();
  });
});
