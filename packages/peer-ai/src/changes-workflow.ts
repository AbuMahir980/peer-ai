// What changed (RFC 0022): on a GitHub Actions project of several parts, render writes a reusable
// workflow that a project's own workflows call first. It says which parts a pull request or push
// touched, so each job runs only for the changes it can apply to (DEL-13). A job skipped by its
// condition reports success, so a required check never waits, which a workflow skipped by a paths
// filter doesn't. It asks GitHub's compare API with the run's own token, needs no checkout, and says
// everything changed whenever it can't tell. Render owns the file the way it owns its other workflows.

import type { PeerAiConfig } from "peer-ai-workflow";
import { withHash } from "./pipeline.ts";

export const CHANGES_FILE = ".github/workflows/peer-ai-changes.yml";

/** Outputs every project gets, which no part can take as its name. */
const RESERVED = ["code", "other"];
/** GitHub lists at most this many files in a comparison; at this many, there may be more. */
const MOST_FILES = 300;

interface Part {
  id: string;
  /** Its folder, relative to the root; empty for a part at the root. */
  path: string;
  /** The parts whose changes count as its own: itself, and every part it uses, through each other. */
  counts: string[];
}

const normalise = (path: string) => path.replace(/^\.\//, "").replace(/\/+$/, "").replace(/^\.$/, "");
const variable = (id: string) => `part_${id.replaceAll("-", "_")}`;
const quoted = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

/** The parts in this repository, each with the parts whose changes count as its own. */
function partsOf(config: PeerAiConfig): Part[] {
  const here = config.tracks.filter((track) => track.status !== "external");
  const ids = new Set(here.map((track) => track.id));
  const uses = new Map(here.map((track) => [track.id, (track.uses ?? []).filter((id) => ids.has(id))]));
  return here.map((track) => {
    const counts = new Set([track.id]);
    const next = [...(uses.get(track.id) ?? [])];
    for (let id = next.shift(); id !== undefined; id = next.shift()) {
      if (counts.has(id)) continue;
      counts.add(id);
      next.push(...(uses.get(id) ?? []));
    }
    return { id: track.id, path: normalise(track.path ?? ""), counts: [...counts] };
  });
}

/** The parts that can't have an output of their own, because their name is one every project has. */
export const reservedParts = (config: PeerAiConfig): string[] =>
  partsOf(config)
    .map((part) => part.id)
    .filter((id) => RESERVED.includes(id));

/** The step's script: what the comparison lists, each file given to the part that holds it most closely. */
function script(parts: Part[]): string[] {
  // The closest folder first, as Peer AI matches a file to its part, and a part at the root last.
  const byFolder = [...parts].sort((a, b) => b.path.length - a.path.length);
  const atRoot = byFolder.some((part) => part.path === "");
  const listing = `if (.files == null) or ((.files | length) >= ${String(MOST_FILES)}) then "unknown" else "known", (.files[] | .filename, (.previous_filename // empty)) end`;
  return [
    "known=false",
    'if [ -n "$BASE" ] && [ "$BASE" != "0000000000000000000000000000000000000000" ]; then',
    `  if listed=$(gh api "repos/$GITHUB_REPOSITORY/compare/$BASE...$HEAD_SHA" --jq ${quoted(listing)}); then`,
    '    [ "$(head -n 1 <<< "$listed")" = known ] && known=true',
    "  fi",
    "fi",
    // Everything counts as changed until GitHub's list says otherwise.
    `code=true other=true ${parts.map((part) => `${variable(part.id)}=true`).join(" ")}`,
    'if [ "$known" = true ]; then',
    `  code=false other=false ${parts.map((part) => `${variable(part.id)}=false`).join(" ")}`,
    "  while IFS= read -r file; do",
    '    case "$file" in',
    '      ""|.peer-ai/*) continue ;;',
    "    esac",
    "    code=true",
    '    case "$file" in',
    ...byFolder.map((part) =>
      part.path === ""
        ? `      *) ${variable(part.id)}=true ;;`
        : `      ${quoted(part.path)}|${quoted(`${part.path}/`)}*) ${variable(part.id)}=true ;;`,
    ),
    ...(atRoot ? [] : ["      *) other=true ;;"]),
    "    esac",
    '  done <<< "$(tail -n +2 <<< "$listed")"',
    "else",
    '  echo "Can\'t tell what changed, so every part counts as changed."',
    "fi",
    "any() {",
    '  for name in "$@"; do',
    '    if [ "${!name}" = true ]; then echo true; return; fi',
    "  done",
    "  echo false",
    "}",
    "{",
    '  echo "code=$code"',
    '  echo "other=$other"',
    ...parts
      .filter((part) => !RESERVED.includes(part.id))
      .map((part) => `  echo "${part.id}=$(any ${part.counts.map(variable).join(" ")})"`),
    '} | tee -a "$GITHUB_OUTPUT"',
  ];
}

/** The workflow, for a project of two parts or more; one part needs nothing to say which changed. */
export function changesWorkflow(config: PeerAiConfig): string | undefined {
  const parts = partsOf(config);
  if (parts.length < 2) return undefined;
  const outputs: [string, string][] = [
    ["code", "true when anything outside .peer-ai/ changed"],
    ["other", "true when anything outside every part changed, such as the root's settings"],
    ...parts
      .filter((part) => !RESERVED.includes(part.id))
      .map((part): [string, string] => {
        const used = part.counts.filter((id) => id !== part.id);
        const folder = part.path === "" ? "the root" : `${part.path}/`;
        return [
          part.id,
          `true when ${folder} changed${used.length === 0 ? "" : `, or ${used.join(", ")}, which it uses`}`,
        ];
      }),
  ];
  const body = [
    "name: Peer AI, what changed",
    "on:",
    "  workflow_call:",
    "    outputs:",
    ...outputs.flatMap(([name, description]) => [
      `      ${name}:`,
      `        description: ${JSON.stringify(description)}`,
      `        value: \${{ jobs.changes.outputs.${name} }}`,
    ]),
    "jobs:",
    "  changes:",
    "    name: what changed",
    "    runs-on: ubuntu-latest",
    "    timeout-minutes: 5",
    "    permissions:",
    "      contents: read",
    "    outputs:",
    ...outputs.map(([name]) => `      ${name}: \${{ steps.changes.outputs.${name} }}`),
    "    steps:",
    "      - name: Ask GitHub what the change touched",
    "        id: changes",
    "        shell: bash",
    "        env:",
    "          GH_TOKEN: ${{ github.token }}",
    // A pull request against its base, a merge queue's group against its base, a push against the commit before it.
    "          BASE: ${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha || github.event.before }}",
    "          HEAD_SHA: ${{ github.event.pull_request.head.sha || github.event.merge_group.head_sha || github.sha }}",
    "        run: |",
    ...script(parts).map((line) => `          ${line}`),
    "",
  ].join("\n");
  const example = parts.find((part) => !RESERVED.includes(part.id))?.id ?? "web";
  return withHash(
    [
      "# Generated by peer-ai render from peer-ai.config.json: which parts a change touched (RFC 0022).",
      "# Change the config, not this file. Render writes it again while it's as render left it, and leaves",
      "# it alone once someone changes it by hand. Nothing runs it until a workflow of yours calls it first,",
      "# and gives each job a condition on what changed:",
      "#",
      "#   jobs:",
      "#     changes:",
      `#       uses: ./${CHANGES_FILE}`,
      `#     ${example}-tests:`,
      "#       needs: changes",
      `#       if: needs.changes.outputs.${example} == 'true' || needs.changes.outputs.other == 'true'`,
      "#",
      "# A job skipped by its condition reports success, so a required check never waits.",
    ],
    body,
  );
}
