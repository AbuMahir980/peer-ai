// The github-actions stack profile's checks, as the workflow render writes (RFC 0006, section 4).
// Each tool is a release checked against its published checksum, or an image pinned to its
// digest, and each job runs one tool on the repository. The same commands run in Peer AI's own CI
// on every rule's failing and passing examples, so what's proven is what a project runs.

import { createHash } from "node:crypto";
import { PROFILES, profileRulesFor, type PipelineJob } from "@peer-ai/standards";
import type { PeerAiConfig } from "@peer-ai/workflow";

export const WORKFLOW_FILE = ".github/workflows/peer-ai-security.yml";

/** The folder the tools are installed in, on the PATH of the job's later steps. */
const TOOLS = '"$RUNNER_TEMP/peer-ai-tools"';

const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1";

const GITLEAKS = {
  version: "8.30.1",
  url: "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz",
  sha256: "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
};
const OSV_SCANNER = {
  version: "2.6.0",
  url: "https://github.com/google/osv-scanner/releases/download/v2.6.0/osv-scanner_linux_amd64",
  sha256: "ca69b3d3cd08f889a49dc0a383122f71cc528b83803671df5fd874d97485b108",
};
const ZIZMOR =
  "ghcr.io/zizmorcore/zizmor:1.30.1@sha256:a2eb396d886c053073405c7a980f2139ba2248ec172243cfa3841e57196e8101";
const SEMGREP = "semgrep/semgrep:1.178.0@sha256:32e459968daabe7ab86968184a29109b9564aa00392401156f9788452b42786b";
const SSLYZE = "nablac0d3/sslyze:6.3.1@sha256:3060ce2f3168cf1d74e5a0989660008052bee645826875122ba7edea95e5b95c";
const ZAP = "ghcr.io/zaproxy/zaproxy:2.17.0@sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef";

/** How a job installs its tool and runs it on the repository, as shell lines. */
export interface JobScript {
  name: string;
  /** Lines that install the tool into $RUNNER_TEMP/peer-ai-tools, which is on the PATH afterwards. */
  install: string[];
  /** Lines that run the tool on the repository at the current folder, failing the job on a finding. */
  scan: string[];
  /** The whole history, for a tool that reads it. */
  history?: boolean;
}

export const JOBS: Record<PipelineJob, JobScript> = {
  secrets: {
    name: `Secrets, with Gitleaks ${GITLEAKS.version}`,
    install: [
      `curl -sSfL -o ${TOOLS}/gitleaks.tar.gz ${GITLEAKS.url}`,
      `echo "${GITLEAKS.sha256}  $RUNNER_TEMP/peer-ai-tools/gitleaks.tar.gz" | sha256sum --check --quiet`,
      `tar -xzf ${TOOLS}/gitleaks.tar.gz -C ${TOOLS} gitleaks`,
    ],
    scan: ["gitleaks git --no-banner --redact --exit-code 1 ."],
    history: true,
  },
  dependencies: {
    name: `Dependencies, with OSV-Scanner ${OSV_SCANNER.version}`,
    install: [
      `curl -sSfL -o ${TOOLS}/osv-scanner ${OSV_SCANNER.url}`,
      `echo "${OSV_SCANNER.sha256}  $RUNNER_TEMP/peer-ai-tools/osv-scanner" | sha256sum --check --quiet`,
      `chmod +x ${TOOLS}/osv-scanner`,
    ],
    // Exit code 128 means no dependencies were found, which isn't a vulnerability.
    scan: ["osv-scanner scan source --recursive . || test $? -eq 128"],
  },
  workflows: {
    name: "Workflows, with zizmor 1.30.1",
    install: [`docker pull ${ZIZMOR}`],
    scan: [`docker run --rm -v "$PWD:/repo:ro" -w /repo ${ZIZMOR} --offline .github/workflows`],
  },
  code: {
    name: "Code scanning, with Semgrep 1.178.0",
    install: [`docker pull ${SEMGREP}`],
    scan: [
      `docker run --rm -v "$PWD:/src:ro" -w /src ${SEMGREP} semgrep scan --config p/default --error --metrics off --quiet .`,
    ],
  },
};

/** The environments with an address, and whether each is production. */
function environments(config: PeerAiConfig): { id: string; url: string; production: boolean }[] {
  return (config.environments ?? []).flatMap((environment) =>
    environment.url === undefined
      ? []
      : [{ id: environment.id, url: environment.url, production: environment.production === true }],
  );
}

const isWholeProject = (id: string) => PROFILES.find((profile) => profile.id === id)?.stacks.length === 0;

/** The pipeline rules that apply at the project's stage, leaving out the ones it set aside. */
export function pipelineRules(config: PeerAiConfig) {
  const setAside = new Set((config.standards?.exceptions ?? []).map((exception) => exception.rule));
  return profileRulesFor({
    listed: (config.standards?.profiles ?? []).filter(isWholeProject),
    stage: config.project.stage ?? "mvp",
    traits: config.project.traits ?? [],
  }).filter((rule) => rule.profile === "github-actions" && !setAside.has(rule.id));
}

const indent = (lines: readonly string[], by: number) => lines.map((line) => `${" ".repeat(by)}${line}`);

/** One job: check out the repository, install the tool, run it. */
function job(id: string, script: JobScript, rules: readonly string[]): string[] {
  return [
    `  ${id}:`,
    `    name: ${script.name} (${rules.join(", ")})`,
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      contents: read",
    "    steps:",
    `      - uses: ${CHECKOUT}`,
    "        with:",
    ...(script.history === true ? ["          fetch-depth: 0"] : []),
    "          persist-credentials: false",
    "      - name: Install",
    "        run: |",
    ...indent(['mkdir -p "$RUNNER_TEMP/peer-ai-tools"', 'echo "$RUNNER_TEMP/peer-ai-tools" >> "$GITHUB_PATH"'], 10),
    ...indent(script.install, 10),
    "      - name: Scan",
    "        run: |",
    ...indent(script.scan, 10),
  ];
}

/** The workflow's body, below its header: its jobs for the rules that apply, or undefined for none. */
export function workflowBody(config: PeerAiConfig): string | undefined {
  const rules = pipelineRules(config);
  if (rules.length === 0) return undefined;
  const lines: string[] = [];
  for (const id of Object.keys(JOBS) as PipelineJob[]) {
    const covered = rules.filter((rule) => rule.enforcer?.tool === "github-actions" && rule.enforcer.job === id);
    if (covered.length > 0)
      lines.push(
        ...job(
          id,
          JOBS[id],
          covered.map((rule) => rule.id),
        ),
      );
  }
  const ids = new Set(rules.map((rule) => rule.id));
  const addresses = environments(config);
  const scheduled = "    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'";
  if (ids.has("GHA-06") && addresses.length > 0) {
    const hosts = addresses.map((environment) => new URL(environment.url).host);
    lines.push(
      "  tls:",
      `    name: TLS, with SSLyze 6.3.1 (GHA-06)`,
      "    runs-on: ubuntu-latest",
      scheduled,
      "    permissions: {}",
      "    steps:",
      "      - name: Check each environment against Mozilla's intermediate profile",
      `        run: docker run --rm ${SSLYZE} --mozilla_config=intermediate ${hosts.join(" ")}`,
    );
  }
  const staging = addresses.filter((environment) => !environment.production);
  if (ids.has("GHA-07") && staging.length > 0) {
    lines.push(
      "  running-app:",
      `    name: The running app in staging, with OWASP ZAP 2.17.0 (GHA-07)`,
      "    runs-on: ubuntu-latest",
      scheduled,
      "    permissions: {}",
      "    steps:",
      ...staging.flatMap((environment) => [
        `      - name: Scan ${environment.id}, never production`,
        `        run: docker run --rm -t ${ZAP} zap-baseline.py -t ${environment.url}`,
      ]),
    );
  }
  const branch = config.repo?.defaultBranch;
  return [
    "name: Peer AI security checks",
    "on:",
    "  pull_request:",
    ...(branch === undefined ? ["  push:"] : ["  push:", `    branches: [${branch}]`]),
    "  schedule:",
    '    - cron: "23 4 * * *"',
    "  workflow_dispatch:",
    "permissions: {}",
    "jobs:",
    ...lines,
    "",
  ].join("\n");
}

const hash = (body: string) => createHash("sha256").update(body).digest("hex").slice(0, 16);
const HASH_LINE = /^# peer-ai sha256: ([0-9a-f]{16})$/m;

/** The whole file render writes: a header recording the body's hash, then the body. */
export function workflowFile(config: PeerAiConfig): string | undefined {
  const body = workflowBody(config);
  if (body === undefined) return undefined;
  return [
    "# Generated by peer-ai render from peer-ai.config.json: the checks of the github-actions stack profile.",
    "# Change the config, not this file. Render writes it again while it's as render left it, and leaves",
    "# it alone once someone changes it by hand.",
    `# peer-ai sha256: ${hash(body)}`,
    body,
  ].join("\n");
}

/** Whether a file is as render wrote it: its body still has the hash its header records. */
export function unchangedSinceRender(content: string): boolean {
  const recorded = HASH_LINE.exec(content)?.[1];
  if (recorded === undefined) return false;
  const body = content.slice(content.indexOf("\n", content.search(HASH_LINE)) + 1);
  return hash(body) === recorded;
}
