// What changed between two versions of Peer AI, in a line each, from the changelog that ships with
// the package, so it works offline (RFC 0014). next_work gives these to the AI tool to tell a
// person what changed since they last worked on the project.

import { readFileSync } from "node:fs";
import { compareVersions } from "./versions.ts";

/** The most notes given, so the reply stays short; the rest are in the release notes. */
const MOST = 10;

/** Each version's changes, newest first: the first sentence of each entry. */
export function parseChangelog(text: string): { version: string; changes: string[] }[] {
  const versions: { version: string; changes: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const heading = /^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)\s*$/.exec(line);
    if (heading?.[1] !== undefined) {
      versions.push({ version: heading[1], changes: [] });
      continue;
    }
    // An entry starts "- <commit>: text"; dependency bumps and their lists aren't changes.
    const entry = /^- (?:[0-9a-f]{7,40}: )?(.+)$/.exec(line);
    const current = versions.at(-1);
    if (entry?.[1] === undefined || current === undefined) continue;
    if (/^Updated dependencies|^peer-ai[\w-]*@/.test(entry[1])) continue;
    current.changes.push(firstSentence(entry[1]));
  }
  return versions;
}

/**
 * The first sentence of an entry, without the bold markup, which reads as noise in a line. A full
 * stop or a colon inside code, such as `"docs": { … }`, or inside a quote, such as "How we work:
 * Peer AI", doesn't end it.
 */
function firstSentence(text: string): string {
  const plain = text.replaceAll("**", "");
  let code = false;
  let quote = false;
  for (let i = 0; i < plain.length; i++) {
    const char = plain[i];
    if (char === "`") code = !code;
    else if (char === '"' && !code) quote = !quote;
    else if (
      !code &&
      !quote &&
      (char === "." || char === ":") &&
      (i + 1 === plain.length || /\s/.test(plain[i + 1] ?? ""))
    ) {
      return `${plain.slice(0, i)}.`;
    }
  }
  return plain;
}

/** The changes after `from` up to and including `to`, oldest first, each as "<version>: <change>". */
export function changesBetween(text: string, from: string, to: string): string[] {
  const notes = parseChangelog(text)
    .filter(({ version }) => compareVersions(version, from) > 0 && compareVersions(version, to) <= 0)
    .reverse()
    .flatMap(({ version, changes }) => changes.map((change) => `${version}: ${change}`));
  return notes.length <= MOST
    ? notes
    : [...notes.slice(0, MOST), `And ${String(notes.length - MOST)} more: see the release notes.`];
}

/** This package's own changelog, which ships with it; empty when it can't be read. */
export function ownChangelog(): string {
  try {
    return readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  } catch {
    return "";
  }
}
