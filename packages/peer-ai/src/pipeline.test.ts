import type { PeerAiConfig } from "@peer-ai/workflow";
import { describe, expect, it } from "vitest";
import { JOBS, pipelineRules, unchangedSinceRender, workflowFile } from "./pipeline.ts";

const repairs = (extra: Partial<PeerAiConfig> = {}): PeerAiConfig => ({
  version: 1,
  project: { name: "Repairs", stage: "mvp" },
  tracks: [{ id: "app", kind: "web", status: "active" }],
  repo: { host: "github", defaultBranch: "main" },
  standards: { profiles: ["github-actions"] },
  ...extra,
});

/** The jobs a workflow runs: the keys under jobs:. */
const jobs = (file: string | undefined) =>
  [...(file ?? "").slice((file ?? "").indexOf("\njobs:\n")).matchAll(/^ {2}([a-z-]+):$/gm)].map((match) => match[1]);

describe("the pipeline workflow", () => {
  it("runs a job for each automatic check at the project's stage, on every change and every day", () => {
    const file = workflowFile(repairs());
    expect(jobs(file)).toEqual(["secrets", "dependencies", "workflows", "code"]);
    expect(file).toContain("on:\n  pull_request:\n  push:\n    branches: [main]\n  schedule:\n");
    expect(workflowFile(repairs({ standards: { profiles: ["react"] } }))).toBeUndefined();
  });

  it("adds the TLS check for each address, and scans the running app in staging, never production", () => {
    const file = workflowFile(
      repairs({
        project: { name: "Repairs", stage: "production" },
        environments: [
          { id: "staging", url: "https://staging.repairs.example.com" },
          { id: "production", production: true, url: "https://repairs.example.com" },
        ],
      }),
    );
    expect(jobs(file)).toEqual(["secrets", "dependencies", "workflows", "code", "tls", "running-app"]);
    expect(file).toContain("--mozilla_config=intermediate staging.repairs.example.com repairs.example.com");
    expect(file).toContain("zap-baseline.py -t https://staging.repairs.example.com");
    expect(file).not.toContain("zap-baseline.py -t https://repairs.example.com");
  });

  it("pins every action to a commit, every image to a digest, and checks every download", () => {
    const file = workflowFile(repairs({ project: { name: "Repairs", stage: "production" } })) ?? "";
    for (const [, action] of file.matchAll(/uses: (\S+)/g)) expect(action).toMatch(/@[0-9a-f]{40}$/);
    for (const [, image] of file.matchAll(/docker (?:pull|run [^\n]*?) ((?:[a-z0-9.-]+\/)+[a-z0-9.-]+:[^\s@]+@\S+)/g)) {
      expect(image).toMatch(/@sha256:[0-9a-f]{64}$/);
    }
    for (const script of Object.values(JOBS)) {
      const downloads = script.install.filter((line) => line.startsWith("curl "));
      const checks = script.install.filter((line) => line.includes("sha256sum --check"));
      expect(checks.length).toBe(downloads.length);
    }
  });

  it("gives the token no permissions, and each job only what it reads", () => {
    const file = workflowFile(repairs()) ?? "";
    expect(file).toContain("\npermissions: {}\n");
    expect(file.match(/^ {4}permissions:\n {6}contents: read$/gm)).toHaveLength(4);
    expect(file).not.toMatch(/:\s*write/);
  });

  it("leaves out a check the project set aside", () => {
    const config = repairs({
      standards: {
        profiles: ["github-actions"],
        exceptions: [{ rule: "GHA-05", reason: "CodeQL runs instead", decidedBy: "Ada" }],
      },
    });
    expect(pipelineRules(config).map((rule) => rule.id)).not.toContain("GHA-05");
    expect(jobs(workflowFile(config))).not.toContain("code");
  });

  it("records a hash of what render wrote, so a change by hand is noticed", () => {
    const file = workflowFile(repairs()) ?? "";
    expect(unchangedSinceRender(file)).toBe(true);
    expect(unchangedSinceRender(file.replace("ubuntu-latest", "ubuntu-24.04"))).toBe(false);
    expect(unchangedSinceRender("name: CI\n")).toBe(false);
  });
});
