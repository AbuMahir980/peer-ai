// How far a project has adopted Peer AI's enforcement (RFC 0011). A project in the report stage, and
// a rule it deferred, get enforcement that reports but never fails a build; a rule the project's
// own tools cover gets no second check. Every package that writes enforcement asks here, so ESLint,
// Ruff and the security workflow agree.

import type { PeerAiConfig } from "./config.ts";

type Standards = NonNullable<PeerAiConfig["standards"]>;
export type Deferral = NonNullable<Standards["deferred"]>[number];
export type Covered = NonNullable<Standards["coveredBy"]>[number];

export interface Adoption {
  /** The whole project's enforcement only reports. */
  report: boolean;
  /** Deferrals still running, by rule. */
  deferred: Map<string, Deferral>;
  /** Deferrals that have ended, so their enforcement is back. */
  ended: Deferral[];
  /** The rules the project's own tools enforce, by rule. */
  coveredBy: Map<string, Covered>;
}

/**
 * Where the project stands. `isOpen` says whether a work item is still open: true or false, or
 * undefined when there is no such item, which ends a deferral waiting for it.
 */
export function adoptionOf(config: PeerAiConfig, today: Date, isOpen: (id: string) => boolean | undefined): Adoption {
  const day = today.toISOString().slice(0, 10);
  const deferred = new Map<string, Deferral>();
  const ended: Deferral[] = [];
  for (const deferral of config.standards?.deferred ?? []) {
    const running = deferral.until !== undefined ? day < deferral.until : isOpen(deferral.untilItem ?? "") === true;
    if (running) deferred.set(deferral.rule, deferral);
    else ended.push(deferral);
  }
  return {
    report: config.standards?.enforcement === "report",
    deferred,
    ended,
    coveredBy: new Map((config.standards?.coveredBy ?? []).map((covered) => [covered.rule, covered])),
  };
}

/** Whether a rule's enforcement reports without blocking: the project reports, or the rule is deferred. */
export const reportsOnly = (adoption: Adoption, rule: string): boolean =>
  adoption.report || adoption.deferred.has(rule);
