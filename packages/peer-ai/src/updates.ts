// Whether a newer Peer AI is out than the version the project uses (RFC 0014). npm is asked at
// most once a day per machine, and the answer kept in the user's cache folder, never in the
// project. Offline, or in CI, the check says nothing that could fail anything.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { ok, skip, warn, type Check } from "./checks.ts";
import { FEEDBACK_REPO } from "./feedback.ts";
import { VERSION } from "./package-info.ts";
import { compareVersions, pinnedVersion } from "./versions.ts";

const DAY = 24 * 60 * 60 * 1000;

/** Peer AI's folder in the user's cache: $XDG_CACHE_HOME, %LOCALAPPDATA% on Windows, or ~/.cache. */
export function cacheDir(): string {
  const base =
    process.env.XDG_CACHE_HOME ??
    (process.platform === "win32" ? process.env.LOCALAPPDATA : undefined) ??
    join(homedir(), ".cache");
  return join(base, "peer-ai");
}

/** Asks npm for the latest release of peer-ai; undefined when it can't be reached. */
export type AskLatest = () => string | undefined;

export const askNpm: AskLatest = () => {
  try {
    const version = execFileSync("npm", ["view", "peer-ai", "dist-tags.latest"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
      shell: process.platform === "win32",
    }).trim();
    return /^\d+\.\d+\.\d+/.test(version) ? version : undefined;
  } catch {
    return undefined;
  }
};

export interface UpdateOptions {
  /** The cache folder; the user's own when left out. */
  cache?: string;
  ask?: AskLatest;
  /** Whether this runs in CI, where the check is skipped; from the CI environment variable when left out. */
  ci?: boolean;
}

/** The latest release, from the cache when it was asked within a day, or from npm. */
export function latestRelease(now: Date, options: UpdateOptions = {}): string | undefined {
  const file = join(options.cache ?? cacheDir(), "latest.json");
  try {
    const cached = JSON.parse(readFileSync(file, "utf8")) as { version?: string; checkedAt?: string };
    const age = now.getTime() - Date.parse(cached.checkedAt ?? "");
    if (age >= 0 && age < DAY) return cached.version;
  } catch {
    // Not asked yet, or unreadable: ask now.
  }
  const version = (options.ask ?? askNpm)();
  try {
    mkdirSync(options.cache ?? cacheDir(), { recursive: true });
    // An unanswered question is kept too, so an offline machine doesn't ask on every session.
    writeFileSync(
      file,
      `${JSON.stringify({ ...(version === undefined ? {} : { version }), checkedAt: now.toISOString() })}\n`,
    );
  } catch {
    // A cache that can't be written only means asking again next time.
  }
  return version;
}

/** doctor's check: a newer release than the project uses. Nothing at all when PEER_AI_UPDATE_CHECK is off. */
export function checkUpdates(root: string, config: PeerAiConfig, now: Date, options: UpdateOptions = {}): Check[] {
  if (process.env.PEER_AI_UPDATE_CHECK === "off") return [];
  if (config.updates?.notify === false) {
    return [skip("updates", "Not checking for newer releases: updates.notify is false")];
  }
  if (options.ci ?? (process.env.CI !== undefined && process.env.CI !== "" && process.env.CI !== "false")) {
    return [skip("updates", "Newer releases aren't checked in CI")];
  }
  const uses = pinnedVersion(root)?.version ?? VERSION;
  const latest = latestRelease(now, options);
  if (latest === undefined)
    return [skip("updates", "npm couldn't be asked for the latest release; it's asked again tomorrow")];
  if (compareVersions(latest, uses) <= 0) return [ok("updates", `Peer AI ${uses} is the latest release`)];
  return [
    warn(
      "updates",
      `Peer AI ${latest} is out, and the project uses ${uses}.`,
      `See what changed at https://github.com/${FEEDBACK_REPO}/releases, then update on a branch: npx --prefer-online peer-ai@latest render. To stay on ${uses}, set "updates": { "notify": false } in peer-ai.config.json.`,
    ),
  ];
}
