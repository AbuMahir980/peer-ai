// The stack profiles and traits assess suggests (RFC 0011). init and migrate take them up unless the
// person says no, and record a no in `declined`, with why. doctor raises any the config has neither
// taken up nor declined, so a project never runs without rules that fit it and nobody noticing.

import type { PeerAiConfig } from "peer-ai-workflow";
import type { Assessment } from "./assess.ts";
import { warn, ok, type Check } from "./checks.ts";
import type { Prompter } from "./prompter.ts";

export interface Suggestion {
  kind: "profile" | "trait";
  id: string;
  /** Why it was suggested, such as "api is tagged fastapi". */
  evidence: string;
}

export interface Uptake {
  adopted: Suggestion[];
  declined: { suggestion: Suggestion; reason: string }[];
}

export function suggestionsOf(assessment: Assessment): Suggestion[] {
  return [
    ...assessment.suggestedProfiles.map(({ profile, evidence }): Suggestion => ({
      kind: "profile",
      id: profile,
      evidence,
    })),
    ...assessment.suggestedTraits.map(({ trait, evidence }): Suggestion => ({ kind: "trait", id: trait, evidence })),
  ];
}

const named = (suggestion: Suggestion) => `the ${suggestion.id} ${suggestion.kind}`;
const key = (suggestion: Suggestion) => `${suggestion.kind}:${suggestion.id}`;

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1] ?? ""}`;
}

/** Every suggestion taken up, for `--yes`. */
export const takeAll = (suggestions: Suggestion[]): Uptake => ({ adopted: suggestions, declined: [] });

/** Asks which suggestions fit, all ticked to start with, and why about any the person unticks. */
export async function choose(suggestions: Suggestion[], prompter: Prompter): Promise<Uptake> {
  if (suggestions.length === 0) return takeAll([]);
  const picked = await prompter.multiselect(
    "Peer AI suggests these from what it found, each with the rules it switches on. Untick any that don't fit.",
    suggestions.map((suggestion) => ({ value: key(suggestion), label: named(suggestion), hint: suggestion.evidence })),
    suggestions.map(key),
  );
  const adopted = suggestions.filter((suggestion) => picked.includes(key(suggestion)));
  const turnedDown = suggestions.filter((suggestion) => !picked.includes(key(suggestion)));
  if (turnedDown.length === 0) return { adopted, declined: [] };
  const reason = await prompter.text(
    `Why ${turnedDown.length === 1 ? "doesn't" : "don't"} ${list(turnedDown.map(named))} fit? It's kept in the config, so ${turnedDown.length === 1 ? "it isn't" : "they aren't"} suggested again.`,
    { required: true },
  );
  return { adopted, declined: turnedDown.map((suggestion) => ({ suggestion, reason })) };
}

/** The config with the suggestions taken up, and those turned down recorded in `declined`. */
export function adopt(config: Record<string, unknown>, uptake: Uptake): Record<string, unknown> {
  const ids = (kind: Suggestion["kind"]) =>
    uptake.adopted.filter((suggestion) => suggestion.kind === kind).map((suggestion) => suggestion.id);
  const project = config.project as Record<string, unknown>;
  const standards = (config.standards ?? {}) as Record<string, unknown>;
  const profiles = [...((standards.profiles as string[] | undefined) ?? []), ...ids("profile")];
  const traits = [...((project.traits as string[] | undefined) ?? []), ...ids("trait")];
  const declined = [
    ...((config.declined as unknown[] | undefined) ?? []),
    ...uptake.declined.map(({ suggestion, reason }) => ({ [suggestion.kind]: suggestion.id, reason })),
  ];
  return {
    ...config,
    project: { ...project, ...(traits.length === 0 ? {} : { traits }) },
    standards: { ...standards, ...(profiles.length === 0 ? {} : { profiles }) },
    ...(declined.length === 0 ? {} : { declined }),
  };
}

/** What init and migrate say they took up and turned down. */
export function describeUptake(uptake: Uptake): string[] {
  return [
    ...(uptake.adopted.length === 0 ? [] : [`Took up what assess suggested: ${list(uptake.adopted.map(named))}.`]),
    ...(uptake.declined.length === 0
      ? []
      : [`Declined ${list(uptake.declined.map(({ suggestion }) => named(suggestion)))}, as you said.`]),
  ];
}

/** doctor: any suggestion the config has neither taken up nor declined. */
export function checkSuggestions(config: PeerAiConfig, assessment: Assessment): Check {
  const open = suggestionsOf(assessment);
  const declined = config.declined?.length ?? 0;
  if (open.length === 0) {
    return ok(
      "suggestions",
      declined === 0
        ? "The config has taken up every profile and trait assess suggests"
        : `The config has taken up or declined every profile and trait assess suggests (${String(declined)} declined)`,
    );
  }
  const profiles = open.filter((suggestion) => suggestion.kind === "profile");
  const traits = open.filter((suggestion) => suggestion.kind === "trait");
  const where = [
    ...(profiles.length === 0 ? [] : ["standards.profiles"]),
    ...(traits.length === 0 ? [] : ["project.traits"]),
  ];
  return warn(
    "suggestions",
    `assess suggests ${list(open.map((suggestion) => `${named(suggestion)} (${suggestion.evidence})`))}.`,
    `Add ${open.length === 1 ? "it" : "them"} to ${list(where)}, or list ${open.length === 1 ? "it" : "them"} in declined, with why.`,
  );
}
