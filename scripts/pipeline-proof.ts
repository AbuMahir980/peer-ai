// Proves the github-actions stack profile's automatic rules against the real tools (RFC 0006):
// installs each tool the way Peer AI's workflow does, then runs the same scan on every rule's
// failing and passing examples, each in a fresh git repository. The failing example must fail the
// scan, and name the rule's finding where it has one; the passing example must pass. The workflow
// render writes must pass its own workflow check too. It runs in CI, on Linux, where the tools do:
//
//     node scripts/pipeline-proof.ts

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PROFILES, type Example } from "peer-ai-standards";
import { IMAGES, JOBS, WORKFLOW_FILE, workflowFile } from "../packages/peer-ai/src/pipeline.ts";

const runnerTemp = process.env.RUNNER_TEMP ?? mkdtempSync(join(tmpdir(), "peer-ai-proof-"));
const tools = join(runnerTemp, "peer-ai-tools");
// Not a pull request, so the secrets scan reads each example repository's whole history.
const env = {
  ...process.env,
  RUNNER_TEMP: runnerTemp,
  GITHUB_EVENT_NAME: "workflow_dispatch",
  PATH: `${tools}:${process.env.PATH ?? ""}`,
};

/** Runs shell lines in a folder, as a workflow step does; returns the exit code and the output. */
function shell(lines: readonly string[], cwd: string): { code: number; output: string } {
  const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", lines.join("\n")], { cwd, env, encoding: "utf8" });
  return { code: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
}

/** A fresh git repository holding one file, committed, as a scan sees a change. */
function repository(file: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "peer-ai-example-"));
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), content);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "--quiet");
  git("add", ".");
  git("-c", "user.name=Proof", "-c", "user.email=proof@example.com", "commit", "--quiet", "-m", "Example");
  return dir;
}

const text = (example: Example) => (typeof example === "string" ? example : example(0));

mkdirSync(tools, { recursive: true });
for (const [id, script] of Object.entries(JOBS)) {
  const installed = shell(script.install, runnerTemp);
  if (installed.code !== 0) throw new Error(`Installing the ${id} tool failed:\n${installed.output}`);
}

const failures: string[] = [];

// Docker trusts the digest and ignores the tag, so each tag is checked to name the pinned digest.
for (const image of Object.values(IMAGES)) {
  const inspected = shell([`docker buildx imagetools inspect ${image.name}:${image.tag}`], runnerTemp);
  const digest = /^Digest:\s+(sha256:[0-9a-f]{64})$/m.exec(inspected.output)?.[1];
  if (digest !== image.digest)
    failures.push(`${image.name}:${image.tag} is ${digest ?? "unknown"}, not the pinned ${image.digest}`);
  console.log(`${image.name}:${image.tag}: ${digest === image.digest ? "matches its pinned digest" : "doesn't match"}`);
}
const rules = PROFILES.flatMap((profile) => profile.rules).filter((rule) => rule.enforcer?.tool === "github-actions");
for (const rule of rules) {
  if (rule.enforcer?.tool !== "github-actions" || rule.examples === undefined) continue;
  const { job, finding } = rule.enforcer;
  const scan = JOBS[job].scan;
  const failing = repository(rule.examples.file, text(rule.examples.fails));
  const passing = repository(rule.examples.file, text(rule.examples.passes));
  const failed = shell(scan, failing);
  const passed = shell(scan, passing);
  if (failed.code === 0) failures.push(`${rule.id}: its failing example passed the ${job} scan`);
  else if (finding !== undefined && !failed.output.includes(finding)) {
    failures.push(`${rule.id}: the ${job} scan failed its example without reporting ${finding}:\n${failed.output}`);
  }
  if (passed.code !== 0) failures.push(`${rule.id}: its passing example failed the ${job} scan:\n${passed.output}`);
  console.log(
    `${rule.id} (${job}): failing example ${failed.code === 0 ? "passed" : "failed"}, passing example ${passed.code === 0 ? "passed" : "failed"}`,
  );
  rmSync(failing, { recursive: true, force: true });
  rmSync(passing, { recursive: true, force: true });
}

// The workflow render writes, with every job, must pass the workflow check it runs.
const own = workflowFile({
  version: 1,
  project: { name: "Repairs", stage: "production" },
  tracks: [{ id: "app", kind: "web", status: "active" }],
  environments: [
    { id: "staging", url: "https://staging.repairs.example.com" },
    { id: "production", production: true, url: "https://repairs.example.com" },
  ],
  repo: { host: "github", defaultBranch: "main" },
  standards: { profiles: ["github-actions"] },
});
if (own === undefined) throw new Error("render wrote no workflow for a project listing github-actions");
const checked = shell(JOBS.workflows.scan, repository(WORKFLOW_FILE, own));
if (checked.code !== 0) failures.push(`Peer AI's own workflow fails its workflow check:\n${checked.output}`);
console.log(`${WORKFLOW_FILE}: ${checked.code === 0 ? "passes" : "fails"} its own workflow check`);

if (failures.length > 0) {
  console.error(`\n${failures.join("\n\n")}`);
  process.exitCode = 1;
}
