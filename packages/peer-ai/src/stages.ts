// Where a project stands in adopting Peer AI's enforcement (RFC 0011), worked out once for render and
// doctor: whether it reports or enforces, the rules it deferred, and the rules its own tools already
// cover, named in the config or found by the tool in its own workflows, so Peer AI adds no second
// check. The security workflow, the Ruff settings and doctor all read it.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { adoptionOf, type Adoption, type PeerAiConfig } from "peer-ai-workflow";
import { allWorkItems } from "./homes.ts";

export const WORKFLOWS = ".github/workflows";
/** Workflows Peer AI writes for itself: a tool in them is Peer AI's own check, not the project's. */
const OWN = ["peer-ai.yml", "peer-ai-security.yml", "copilot-setup-steps.yml"];

/** The tool each of the security workflow's jobs runs, as it shows in a workflow that runs it. */
export const JOB_TOOLS: Record<string, { tool: string; pattern: RegExp }> = {
  secrets: { tool: "gitleaks", pattern: /\bgitleaks\b/i },
  dependencies: { tool: "osv-scanner", pattern: /\bosv-scanner\b/i },
  workflows: { tool: "zizmor", pattern: /\bzizmor\b/i },
  code: { tool: "Semgrep", pattern: /\bsemgrep\b/i },
  tls: { tool: "SSLyze", pattern: /\bsslyze\b/i },
  "running-app": { tool: "ZAP", pattern: /\bzap-(baseline|full-scan|api-scan)\b|\bzaproxy\b/i },
};

export interface Enforcement {
  adoption: Adoption;
  /** The security workflow's jobs whose tool a workflow of the project's own runs, with where. */
  runByProject: Map<string, string>;
}

/** No adoption at all: enforcement blocks, and nothing is covered elsewhere. */
export const ENFORCING: Enforcement = {
  adoption: { report: false, deferred: new Map(), ended: [], coveredBy: new Map() },
  runByProject: new Map(),
};

function projectWorkflows(root: string): string[] {
  const dir = join(root, WORKFLOWS);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name) && !OWN.includes(name))
    .sort()
    .map((name) => `${WORKFLOWS}/${name}`);
}

/** Lines of a workflow that run something, without its comments. */
const running = (text: string): string =>
  text
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");

export function enforcementFor(root: string, config: PeerAiConfig, today: Date = new Date()): Enforcement {
  const items = allWorkItems(root).map(({ item }) => item);
  const adoption = adoptionOf(config, today, (id) => {
    const item = items.find((candidate) => candidate.id === id);
    return item === undefined ? undefined : item.stage !== "done" && item.stage !== "cancelled";
  });
  const runByProject = new Map<string, string>();
  for (const file of projectWorkflows(root)) {
    const text = running(readFileSync(join(root, file), "utf8"));
    for (const [job, { tool, pattern }] of Object.entries(JOB_TOOLS)) {
      if (!runByProject.has(job) && pattern.test(text)) runByProject.set(job, `${file}, which runs ${tool}`);
    }
  }
  return { adoption, runByProject };
}
