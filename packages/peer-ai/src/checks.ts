// The results `peer-ai doctor` and `peer-ai check` report, and how they are printed.

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export interface Check {
  id: string;
  status: CheckStatus;
  message: string;
  fix?: string;
}

export const ok = (id: string, message: string): Check => ({ id, status: "ok", message });
export const skip = (id: string, message: string): Check => ({ id, status: "skip", message });
export const warn = (id: string, message: string, fix: string): Check => ({ id, status: "warn", message, fix });
export const fail = (id: string, message: string, fix: string): Check => ({ id, status: "fail", message, fix });

export const plural = (count: number, word: string): string => `${String(count)} ${word}${count === 1 ? "" : "s"}`;

export const count = (checks: Check[], status: CheckStatus): number =>
  checks.filter((check) => check.status === status).length;

const SYMBOL: Record<CheckStatus, string> = { ok: "✓", warn: "!", fail: "✗", skip: "–" };

/** One line per check, with its fix indented beneath it. */
export function formatChecks(checks: Check[]): string[] {
  return checks.flatMap((check) => [
    `  ${SYMBOL[check.status]} ${check.message}`,
    ...(check.fix === undefined ? [] : [`      ${check.fix}`]),
  ]);
}
