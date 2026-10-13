// doctor's look at the project's own CI (RFC 0022): warnings, never failures, where a workflow runs
// work on changes it can't apply to (DEL-13). A deployment on pull requests, runs a newer push has
// replaced left running, and a part's jobs on every pull request whatever it changed. doctor reads
// what a workflow is for from its jobs, and can be wrong, so a workflow the project means that way
// is listed in `declined`, with why, and isn't warned about again.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { parse as parseYaml } from "yaml";
import { CHANGES_FILE } from "./changes-workflow.ts";
import { type Check, ok, plural, warn } from "./checks.ts";
import { CONFIG_FILE } from "./detect.ts";
import { OWN_WORKFLOWS } from "./gate.ts";
import { CANCEL_REPLACED } from "./pipeline.ts";

const WORKFLOWS = ".github/workflows";

interface Step {
  name?: unknown;
  uses?: unknown;
  run?: unknown;
  "working-directory"?: unknown;
}

interface Job {
  name?: unknown;
  if?: unknown;
  environment?: unknown;
  concurrency?: unknown;
  defaults?: { run?: { "working-directory"?: unknown } };
  steps?: unknown;
}

interface Workflow {
  on?: unknown;
  concurrency?: unknown;
  defaults?: { run?: { "working-directory"?: unknown } };
  /** Each job as the YAML holds it, which can be empty. */
  jobs?: Record<string, unknown>;
}

/** Actions and commands that deploy. A preview of a pull request is meant for it, and isn't one. */
const DEPLOY_ACTIONS = /deploy|gh-pages|vercel-action|actions-netlify|wrangler-action|pages-action/i;
const DEPLOY_COMMANDS = [
  /\b(vercel|netlify|fly|flyctl|firebase|wrangler|serverless|sls|cdk|eb|gcloud(\s+[a-z-]+)*)\s+deploy\b/,
  /\bvercel\b[^\n]*\s--prod\b/,
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?deploy\b/,
  /\bmake\s+deploy\b/,
  /\bterraform\s+apply\b/,
];
const DEPLOY_ENVIRONMENT = /prod|staging|live|release/i;
const PREVIEW = /preview/i;
/** Ways a workflow already says what changed, besides Peer AI's own. */
const SAYS_WHAT_CHANGED = [CHANGES_FILE, "paths-filter", "changed-files", "git diff --name-only"];

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const normalise = (path: string) => path.replace(/^\.\//, "").replace(/\/+$/, "");

/** The events a workflow runs on, and the pull request trigger's settings when it has one. */
function triggers(on: unknown): { events: string[]; pullRequest?: Record<string, unknown> } {
  if (typeof on === "string") return { events: [on] };
  if (Array.isArray(on)) return { events: on.filter((event): event is string => typeof event === "string") };
  if (on === null || typeof on !== "object") return { events: [] };
  const events = Object.keys(on);
  const settings = (on as Record<string, unknown>).pull_request ?? (on as Record<string, unknown>).pull_request_target;
  return {
    events,
    ...(settings !== null && typeof settings === "object" ? { pullRequest: settings as Record<string, unknown> } : {}),
  };
}

const stepsOf = (job: Job): Step[] =>
  Array.isArray(job.steps) ? job.steps.filter((step): step is Step => step !== null && typeof step === "object") : [];

/** Whether a concurrency setting cancels the run a newer one replaces. */
const cancels = (concurrency: unknown): boolean =>
  concurrency !== null &&
  typeof concurrency === "object" &&
  "cancel-in-progress" in concurrency &&
  concurrency["cancel-in-progress"] !== false &&
  concurrency["cancel-in-progress"] !== "false";

/** Whether a job deploys: to a deployment environment, or through a step that does. */
function deploys(id: string, job: Job, environments: string[]): boolean {
  const environment = text(job.environment) ?? text((job.environment as { name?: unknown } | undefined)?.name);
  if ([id, text(job.name), environment].some((name) => name !== undefined && PREVIEW.test(name))) return false;
  // An environment worked out as the workflow runs can't be read here.
  if (environment !== undefined && !environment.includes("${{")) {
    if (environments.includes(environment.toLowerCase()) || DEPLOY_ENVIRONMENT.test(environment)) return true;
  }
  return stepsOf(job).some((step) => {
    const uses = text(step.uses)?.split("@")[0];
    if (uses !== undefined && DEPLOY_ACTIONS.test(uses) && !PREVIEW.test(text(step.name) ?? "")) return true;
    const run = text(step.run);
    return run !== undefined && DEPLOY_COMMANDS.some((command) => command.test(run));
  });
}

/** The part a job works on, from its folder, a cd into a part's folder, or the part's id in its own. */
function partOf(id: string, job: Job, workflow: Workflow, parts: { id: string; path: string }[]): string | undefined {
  const folders = [
    text(workflow.defaults?.run?.["working-directory"]),
    text(job.defaults?.run?.["working-directory"]),
    ...stepsOf(job).map((step) => text(step["working-directory"])),
    ...stepsOf(job).flatMap((step) =>
      [...(text(step.run) ?? "").matchAll(/\bcd\s+["']?([^\s"';&|]+)/g)].map((m) => m[1]),
    ),
  ]
    .filter((folder): folder is string => folder !== undefined)
    .map(normalise);
  const byFolder = [...parts]
    .sort((a, b) => b.path.length - a.path.length)
    .find((part) => folders.some((folder) => folder === part.path || folder.startsWith(`${part.path}/`)));
  if (byFolder !== undefined) return byFolder.id;
  const words = id.toLowerCase().split(/[-_]/);
  return parts.find((part) => words.includes(part.id) || id.toLowerCase() === part.id)?.id;
}

/** The project's own workflows, by path, each parsed; one that isn't YAML is left to GitHub to report. */
function projectWorkflows(root: string): [string, Workflow, string][] {
  const dir = join(root, WORKFLOWS);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .map((name) => `${WORKFLOWS}/${name}`)
    .filter((path) => !OWN_WORKFLOWS.includes(path))
    .flatMap((path): [string, Workflow, string][] => {
      const source = readFileSync(join(root, path), "utf8");
      try {
        const parsed: unknown = parseYaml(source);
        return parsed !== null && typeof parsed === "object" ? [[path, parsed, source]] : [];
      } catch {
        return [];
      }
    });
}

const DECLINE = `If it's meant to, list it in declined in ${CONFIG_FILE}, with why: { "workflow": "<path>", "reason": "…" }.`;

/** doctor's warnings about the project's own workflows: where they run checks that can't apply. */
export function checkWorkflowScope(root: string, config: PeerAiConfig): Check[] {
  const workflows = projectWorkflows(root);
  if (workflows.length === 0) return [];
  const declined = new Map(
    (config.declined ?? []).flatMap((entry) =>
      "workflow" in entry ? [[normalise(entry.workflow), entry.reason] as const] : [],
    ),
  );
  const environments = (config.environments ?? []).map((environment) => environment.id.toLowerCase());
  const parts = config.tracks
    .filter((track) => track.status !== "external" && track.path !== undefined)
    .map((track) => ({ id: track.id, path: normalise(track.path ?? "") }))
    .filter((part) => part.path !== "" && part.path !== ".");
  const several = config.tracks.filter((track) => track.status !== "external").length > 1;

  const checks: Check[] = [];
  let read = 0;
  for (const [path, workflow, source] of workflows) {
    const reason = declined.get(path);
    if (reason !== undefined) {
      checks.push(ok("ci-scope", `${path} runs as it does on purpose: ${reason}`));
      continue;
    }
    read++;
    const { events, pullRequest } = triggers(workflow.on);
    if (!events.includes("pull_request") && !events.includes("pull_request_target")) continue;
    const jobs = Object.entries(workflow.jobs ?? {}).filter(
      (entry): entry is [string, Job] => entry[1] !== null && typeof entry[1] === "object",
    );
    const unconditioned = jobs.filter(([, job]) => job.if === undefined);

    const deploying = unconditioned.filter(([id, job]) => deploys(id, job, environments)).map(([id]) => id);
    if (deploying.length > 0) {
      checks.push(
        warn(
          "ci-scope",
          `${path} deploys on pull requests: ${deploying.join(", ")}. What a deployment checks isn't there until the change is released, so it fails, or ships work that hasn't merged.`,
          `Run it on a push to the default branch, a tag, or by hand, or give each job an if for when it applies. ${DECLINE}`,
        ),
      );
    }

    if (!cancels(workflow.concurrency) && !(jobs.length > 0 && jobs.every(([, job]) => cancels(job.concurrency)))) {
      const [, group, cancel] = CANCEL_REPLACED.map((line) => line.trim());
      checks.push(
        warn(
          "ci-scope",
          `${path} keeps running a pull request's checks after a newer push replaces them.`,
          `Add concurrency at the top of it, with ${group ?? ""} and ${cancel ?? ""}. ${DECLINE}`,
        ),
      );
    }

    const filtered = pullRequest !== undefined && ("paths" in pullRequest || "paths-ignore" in pullRequest);
    if (several && !filtered && !SAYS_WHAT_CHANGED.some((way) => source.includes(way))) {
      const scoped = unconditioned.flatMap(([id, job]) => {
        const part = partOf(id, job, workflow, parts);
        return part === undefined ? [] : [`${id} (${part})`];
      });
      if (scoped.length > 0) {
        checks.push(
          warn(
            "ci-scope",
            `${path} runs ${scoped.join(", ")} on every pull request, whatever it changed.`,
            `Call ${CHANGES_FILE} first, and give each job a condition on its part, such as if: needs.changes.outputs.<part> == 'true' || needs.changes.outputs.other == 'true'. Run npx peer-ai render if it isn't there yet. ${DECLINE}`,
          ),
        );
      }
    }
  }
  if (read > 0 && !checks.some((check) => check.status === "warn")) {
    checks.unshift(
      ok(
        "ci-scope",
        `${plural(read, "workflow")} of your own read: none deploys on pull requests, leaves replaced runs running, or runs a part's jobs whatever changed.`,
      ),
    );
  }
  return checks;
}
