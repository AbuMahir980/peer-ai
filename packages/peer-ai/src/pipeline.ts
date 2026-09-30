// The github-actions stack profile's checks, as the workflow render writes (RFC 0006, section 4).
// Each tool is a release checked against its published checksum, or an image pinned to its
// digest, and Semgrep's rules are pinned to a commit. Each job runs one tool on the repository.
// The same commands run in Peer AI's own CI on every rule's failing and passing examples, so
// what's proven is what a project runs.
//
// Job names never change, since a project makes them required checks: a tool's version or the
// rules a job covers appear only in its steps.

import { createHash } from "node:crypto";
import { PROFILES, profileRulesFor, type PipelineJob } from "@peer-ai/standards";
import type { PeerAiConfig } from "@peer-ai/workflow";

export const WORKFLOW_FILE = ".github/workflows/peer-ai-security.yml";

/** The folder the tools are installed in, on the PATH of the job's later steps. */
const TOOLS = '"$RUNNER_TEMP/peer-ai-tools"';

const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1";
const UPLOAD = "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1";

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

/** A container image, pinned to its digest: Docker uses the digest, and the tag says which release it is. */
export interface Image {
  name: string;
  tag: string;
  digest: string;
}

export const IMAGES = {
  zizmor: {
    name: "ghcr.io/zizmorcore/zizmor",
    tag: "1.30.1",
    digest: "sha256:a2eb396d886c053073405c7a980f2139ba2248ec172243cfa3841e57196e8101",
  },
  semgrep: {
    name: "semgrep/semgrep",
    tag: "1.178.0",
    digest: "sha256:32e459968daabe7ab86968184a29109b9564aa00392401156f9788452b42786b",
  },
  sslyze: {
    name: "nablac0d3/sslyze",
    tag: "6.3.1",
    digest: "sha256:3060ce2f3168cf1d74e5a0989660008052bee645826875122ba7edea95e5b95c",
  },
  zap: {
    name: "ghcr.io/zaproxy/zaproxy",
    tag: "2.17.0",
    digest: "sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef",
  },
} satisfies Record<string, Image>;

export const imageRef = (image: Image) => `${image.name}:${image.tag}@${image.digest}`;

/** Semgrep's security rules for the common languages, at one commit, which git checks by its hash. */
const SEMGREP_RULES = {
  repository: "https://github.com/semgrep/semgrep-rules",
  commit: "07135b5255b20ad6c29967215422b1ecc1f03988",
  folders: ["python", "javascript", "typescript", "go", "java", "ruby", "php", "csharp"].map(
    (language) => `${language}/lang/security`,
  ),
};

/** How a job installs its tool and runs it on the repository, as shell lines. */
export interface JobScript {
  /** The job's name, which a project makes a required check. It never changes. */
  name: string;
  /** The tool and its version, for the steps' names. */
  tool: string;
  /** Lines that install the tool into $RUNNER_TEMP/peer-ai-tools, which is on the PATH afterwards. */
  install: string[];
  /** Lines that run the tool on the repository at the current folder, failing the job on a finding. */
  scan: string[];
  /** The whole history, for a tool that reads it. */
  history?: boolean;
  /** Environment variables the scan reads, from GitHub's contexts: never pasted into the script. */
  env?: Record<string, string>;
}

export const JOBS: Record<PipelineJob, JobScript> = {
  secrets: {
    name: "peer-ai / secrets",
    tool: `Gitleaks ${GITLEAKS.version}`,
    install: [
      `curl -sSfL -o ${TOOLS}/gitleaks.tar.gz ${GITLEAKS.url}`,
      `echo "${GITLEAKS.sha256}  $RUNNER_TEMP/peer-ai-tools/gitleaks.tar.gz" | sha256sum --check --quiet`,
      `tar -xzf ${TOOLS}/gitleaks.tar.gz -C ${TOOLS} gitleaks`,
    ],
    // A pull request's own commits; every other run, the whole history. A secret already replaced
    // is recorded in .gitleaksignore, with why.
    scan: [
      'if [ "$GITHUB_EVENT_NAME" = "pull_request" ]; then',
      '  gitleaks git --no-banner --redact --verbose --exit-code 1 --log-opts="$BASE_SHA..$HEAD_SHA" .',
      "else",
      "  gitleaks git --no-banner --redact --verbose --exit-code 1 .",
      "fi",
    ],
    history: true,
    env: {
      BASE_SHA: "${{ github.event.pull_request.base.sha }}",
      HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
    },
  },
  dependencies: {
    name: "peer-ai / dependencies",
    tool: `OSV-Scanner ${OSV_SCANNER.version}`,
    install: [
      `curl -sSfL -o ${TOOLS}/osv-scanner ${OSV_SCANNER.url}`,
      `echo "${OSV_SCANNER.sha256}  $RUNNER_TEMP/peer-ai-tools/osv-scanner" | sha256sum --check --quiet`,
      `chmod +x ${TOOLS}/osv-scanner`,
    ],
    // Exit code 128 means it found nothing it can read: not a vulnerability, but said out loud.
    scan: [
      "status=0",
      "osv-scanner scan source --recursive . || status=$?",
      'if [ "$status" -eq 128 ]; then',
      '  echo "::warning::OSV-Scanner found no lockfile or manifest it can read, so no dependency was checked."',
      'elif [ "$status" -ne 0 ]; then',
      '  exit "$status"',
      "fi",
    ],
  },
  workflows: {
    name: "peer-ai / workflows",
    tool: `zizmor ${IMAGES.zizmor.tag}`,
    install: [`docker pull ${imageRef(IMAGES.zizmor)}`],
    // The whole repository, so actions kept in it are checked as well as the workflows.
    scan: [`docker run --rm -v "$PWD:/repo:ro" -w /repo ${imageRef(IMAGES.zizmor)} --offline .`],
  },
  code: {
    name: "peer-ai / code",
    tool: `Semgrep ${IMAGES.semgrep.tag}`,
    install: [
      `git init -q ${TOOLS}/semgrep-rules`,
      `git -C ${TOOLS}/semgrep-rules fetch -q --depth 1 ${SEMGREP_RULES.repository} ${SEMGREP_RULES.commit}`,
      `git -C ${TOOLS}/semgrep-rules checkout -q FETCH_HEAD`,
      `docker pull ${imageRef(IMAGES.semgrep)}`,
    ],
    scan: [
      [
        `docker run --rm -v "$PWD:/src:ro" -v ${TOOLS}/semgrep-rules:/rules:ro -w /src ${imageRef(IMAGES.semgrep)}`,
        "semgrep scan",
        ...SEMGREP_RULES.folders.map((folder) => `--config /rules/${folder}`),
        "--error --metrics off --quiet .",
      ].join(" "),
    ],
  },
};

/** A value quoted for the shell, whatever it holds. */
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

/** An environment with an address the pipeline can check. */
interface Address {
  id: string;
  url: string;
  host: string;
  production: boolean | undefined;
}

/**
 * The environments' addresses, split into those the pipeline can use and those it can't: an
 * address that isn't a full http or https URL, or that holds a user name or password, which would
 * be written into the committed workflow.
 */
export function environmentAddresses(config: PeerAiConfig): {
  usable: Address[];
  unusable: { id: string; url: string }[];
} {
  const usable: Address[] = [];
  const unusable: { id: string; url: string }[] = [];
  for (const environment of config.environments ?? []) {
    if (environment.url === undefined) continue;
    const url = URL.canParse(environment.url) ? new URL(environment.url) : undefined;
    const fits =
      url !== undefined && ["http:", "https:"].includes(url.protocol) && url.username === "" && url.password === "";
    if (!fits) {
      unusable.push({ id: environment.id, url: environment.url });
      continue;
    }
    usable.push({ id: environment.id, url: url.href, host: url.host, production: environment.production });
  }
  return { usable, unusable };
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
    `    name: ${script.name}`,
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      contents: read",
    "    steps:",
    `      - uses: ${CHECKOUT}`,
    "        with:",
    ...(script.history === true ? ["          fetch-depth: 0"] : []),
    "          persist-credentials: false",
    `      - name: Install ${script.tool}`,
    "        run: |",
    ...indent(['mkdir -p "$RUNNER_TEMP/peer-ai-tools"', 'echo "$RUNNER_TEMP/peer-ai-tools" >> "$GITHUB_PATH"'], 10),
    ...indent(script.install, 10),
    `      - name: Check ${rules.join(", ")}`,
    ...(script.env === undefined
      ? []
      : ["        env:", ...Object.entries(script.env).map(([key, value]) => `          ${key}: ${value}`)]),
    "        run: |",
    ...indent(script.scan, 10),
  ];
}

const SCHEDULED = "    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'";

/** The workflow's jobs for the rules that apply, and the environments with usable addresses. */
function jobs(config: PeerAiConfig): string[] {
  const rules = pipelineRules(config);
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
  const { usable } = environmentAddresses(config);
  if (ids.has("GHA-06") && usable.length > 0) {
    lines.push(
      "  tls:",
      "    name: peer-ai / tls",
      "    runs-on: ubuntu-latest",
      SCHEDULED,
      "    permissions: {}",
      "    steps:",
      `      - name: Check GHA-06 with SSLyze ${IMAGES.sslyze.tag}, against Mozilla's intermediate profile`,
      `        run: docker run --rm ${imageRef(IMAGES.sslyze)} --mozilla_config=intermediate ${usable.map((address) => quote(address.host)).join(" ")}`,
    );
  }
  // Only an environment the config marks as not production is scanned: one it doesn't mark might be.
  const staging = usable.filter((address) => address.production === false);
  if (ids.has("GHA-07") && staging.length > 0) {
    lines.push(
      "  running-app:",
      "    name: peer-ai / running-app",
      "    runs-on: ubuntu-latest",
      SCHEDULED,
      "    permissions:",
      "      contents: read",
      "    steps:",
      `      - uses: ${CHECKOUT}`,
      "        with:",
      "          persist-credentials: false",
      "      - name: Prepare the scan, with the accepted findings in .github/zap-rules.tsv",
      "        run: |",
      "          mkdir -p zap && chmod 777 zap",
      "          if [ -f .github/zap-rules.tsv ]; then cp .github/zap-rules.tsv zap/; fi",
      ...staging.flatMap((address) => [
        `      - name: Check GHA-07 with OWASP ZAP ${IMAGES.zap.tag} in ${address.id}, which isn't production`,
        "        run: |",
        "          if [ -f zap/zap-rules.tsv ]; then set -- -c zap-rules.tsv; fi",
        `          docker run --rm -v "$PWD/zap:/zap/wrk:rw" ${imageRef(IMAGES.zap)} zap-baseline.py -t ${quote(address.url)} -J ${quote(`zap-${address.id}.json`)} "$@"`,
      ]),
      `      - uses: ${UPLOAD}`,
      "        if: always()",
      "        with:",
      "          name: zap-reports",
      "          path: zap/*.json",
    );
  }
  return lines;
}

/** The workflow's body, below its header, or undefined when no job applies. */
export function workflowBody(config: PeerAiConfig): string | undefined {
  const body = jobs(config);
  if (body.length === 0) return undefined;
  const branch = config.repo?.defaultBranch;
  return [
    "name: Peer AI security checks",
    "on:",
    "  pull_request:",
    // With no default branch in the config, changes are checked in their pull requests.
    ...(branch === undefined ? [] : ["  push:", `    branches: [${branch}]`]),
    "  schedule:",
    '    - cron: "23 4 * * *"',
    "  workflow_dispatch:",
    "permissions: {}",
    "jobs:",
    ...body,
    "",
  ].join("\n");
}

/** The jobs the workflow render writes would run: the keys under jobs:. */
export function workflowJobs(config: PeerAiConfig): string[] {
  return [...(workflowBody(config) ?? "").matchAll(/^ {2}([a-z-]+):$/gm)]
    .map((match) => match[1] ?? "")
    .filter((id) => !["pull_request", "push", "schedule", "workflow_dispatch"].includes(id));
}

const normalise = (text: string) => text.replaceAll("\r\n", "\n");
const hash = (body: string) => createHash("sha256").update(normalise(body)).digest("hex").slice(0, 16);
const HASH_LINE = /^# peer-ai sha256: ([0-9a-f]{16})$/m;

/** The whole file render writes: a header recording the body's hash, then the body. */
export function workflowFile(config: PeerAiConfig): string | undefined {
  const body = workflowBody(config);
  if (body === undefined) return undefined;
  return [
    "# Generated by peer-ai render from peer-ai.config.json: the checks of the github-actions stack profile.",
    "# Change the config, not this file. Render writes it again while it's as render left it, and leaves",
    "# it alone once someone changes it by hand. Make each job a required check: their names never change.",
    `# peer-ai sha256: ${hash(body)}`,
    body,
  ].join("\n");
}

/** Whether a file was written by render: it records a hash in its header. */
export const writtenByRender = (content: string) => HASH_LINE.test(normalise(content));

/** Whether a file is as render wrote it: its body still has the hash its header records. */
export function unchangedSinceRender(content: string): boolean {
  const text = normalise(content);
  const recorded = HASH_LINE.exec(text)?.[1];
  if (recorded === undefined) return false;
  const body = text.slice(text.indexOf("\n", text.search(HASH_LINE)) + 1);
  return hash(body) === recorded;
}

/** Whether two files are the same apart from their line endings. */
export const sameFile = (a: string, b: string) => normalise(a) === normalise(b);
