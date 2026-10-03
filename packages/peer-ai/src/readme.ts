// A short section for people in the project's README, "How we work: Peer AI" (RFC 0014): what
// Peer AI does here, that nobody needs to install it, and one command, then the details folded
// away, written from the config so they stay true as it changes. Off unless docs.readme is true.

import type { PeerAiConfig } from "peer-ai-workflow";
import { FEEDBACK_REPO } from "./feedback.ts";

export const README_START = "<!-- peer-ai:readme:start -->";
export const README_END = "<!-- peer-ai:readme:end -->";

const STAGES: Record<"prototype" | "mvp" | "production", string> = {
  prototype:
    "Nothing is required yet. Serious problems are still reported, and the basics, such as no secrets in code, apply from day one.",
  mvp: "Requirements, an API contract, CI, tests, a threat model, a record of the personal data the product holds, and a README. Each change gets the reviews it needs, such as a security review for code.",
  production:
    "Everything an MVP needs, plus architecture, specs, a data model, a data protection impact assessment, design, written standards, separate environments, infrastructure, observability, service targets, runbooks and load testing. A missing review stops a release.",
};

function folded(summary: string, body: string[]): string[] {
  return ["<details>", `<summary>${summary}</summary>`, "", ...body, "", "</details>", ""];
}

/** The section, between its markers, from the config and the version render runs as. */
export function readmeSection(config: PeerAiConfig, version: string): string {
  const stage = config.project.stage ?? "mvp";
  const check = config.commands?.verifyCheck;
  const verify = config.commands?.verify ?? undefined;
  const enforcement = config.standards?.enforcement ?? "enforce";
  const deferred = config.standards?.deferred ?? [];
  const profiles = config.standards?.profiles ?? [];
  return [
    README_START,
    "## How we work: Peer AI",
    "",
    `This project uses [Peer AI](https://github.com/${FEEDBACK_REPO}) to hold the AI coding tools we use to a careful team's standard: work is planned in small items, each verified and reviewed, and \`peer-ai check\` in CI won't let a change merge until its record shows that. Nobody needs to install anything. To see how the setup stands, run \`npx peer-ai doctor\`.`,
    "",
    ...folded(`The stage: ${stage}`, [`The project is at the ${stage} stage, which asks for: ${STAGES[stage]}`]),
    ...folded("What a pull request needs", [
      "Each change has a work item on its branch, kept in `.peer-ai/work/`. Before the pull request merges, the item moves to ship, which needs:",
      "",
      check !== undefined
        ? `- a passing verify on the branch's latest commit: CI's \`${check}\` counts${verify === undefined ? "" : `, or \`${verify}\` run locally`};`
        : `- a passing verify on the branch's latest commit${verify === undefined ? "" : `, from \`${verify}\``};`,
      "- each review the change needs, recorded with its report.",
      "",
      "`peer-ai check` on the pull request says what's missing, in its job summary. Run `npx peer-ai ship` to move the branch's item to ship, or to see what's still missing.",
    ]),
    ...(profiles.length === 0
      ? []
      : folded("The checks that enforce the standards", [
          `The stack profiles in use: ${profiles.join(", ")}.`,
          enforcement === "report"
            ? "Their tools run and report what they find without failing a build, while the codebase catches up."
            : "Their tools fail the build on what they find.",
          ...(deferred.length === 0
            ? []
            : [
                "",
                "Rules that only report for now:",
                "",
                ...deferred.map(
                  (each) =>
                    `- ${each.rule}, until ${"until" in each && each.until !== undefined ? each.until : `${String(each.untilItem)} is done`}: ${each.reason}`,
                ),
              ]),
        ])),
    ...folded("Updating Peer AI", [
      `The project uses Peer AI ${version}, pinned so everyone and CI run the same one. \`npx peer-ai doctor\`, and your AI tool at the start of a session, says when a newer one is out. To update, on a branch, run \`npx --prefer-online peer-ai@latest render\`, then review, commit and merge what it changes, and reconnect your AI tool.`,
    ]),
    README_END,
  ].join("\n");
}
