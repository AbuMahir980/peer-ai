// The github-actions stack profile's checks, as the workflow render writes (RFC 0006, section 4).
// Each tool is a release checked against its published checksum, or an image pinned to its
// digest, and Semgrep's rules are pinned to a commit. Each job runs one tool on the repository.
// The same commands run in Peer AI's own CI on every rule's failing and passing examples, so
// what's proven is what a project runs.
//
// Job names never change, since a project makes them required checks: a tool's version or the
// rules a job covers appear only in its steps.

import { createHash } from "node:crypto";
import { PROFILES, profileRulesFor, type PipelineJob } from "peer-ai-standards";
import { reportsOnly, type PeerAiConfig } from "peer-ai-workflow";
import { ENFORCING, type Enforcement } from "./stages.ts";

export const WORKFLOW_FILE = ".github/workflows/peer-ai-security.yml";

/** The folder the tools are installed in, on the PATH of the job's later steps. */
const TOOLS = '"$RUNNER_TEMP/peer-ai-tools"';

export const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1";
export const SETUP_NODE = "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0";
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

/** A job that reports what it finds without failing the build, while its rules only report (RFC 0011). */
const REPORTS = "    continue-on-error: true";

/** One job: check out the repository, install the tool, run it. */
function job(id: string, script: JobScript, rules: readonly string[], reports: boolean): string[] {
  return [
    `  ${id}:`,
    `    name: ${script.name}`,
    "    runs-on: ubuntu-latest",
    ...(reports ? [REPORTS] : []),
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

/** The rules the workflow's jobs enforce: those that apply, less those the project's own tools cover. */
function enforcedRules(config: PeerAiConfig, enforcement: Enforcement) {
  return pipelineRules(config).filter((rule) => !enforcement.adoption.coveredBy.has(rule.id));
}

/** The workflow's jobs for the rules that apply, and the environments with usable addresses. */
function jobs(config: PeerAiConfig, enforcement: Enforcement = ENFORCING): string[] {
  const rules = enforcedRules(config, enforcement);
  const reports = (ids: readonly string[]) => ids.some((id) => reportsOnly(enforcement.adoption, id));
  const lines: string[] = [];
  for (const id of Object.keys(JOBS) as PipelineJob[]) {
    // A tool the project's own workflow runs already gets no second job (RFC 0011).
    if (enforcement.runByProject.has(id)) continue;
    const covered = rules.filter((rule) => rule.enforcer?.tool === "github-actions" && rule.enforcer.job === id);
    if (covered.length > 0) {
      const ids = covered.map((rule) => rule.id);
      lines.push(...job(id, JOBS[id], ids, reports(ids)));
    }
  }
  const ids = new Set(rules.map((rule) => rule.id));
  const { usable } = environmentAddresses(config);
  if (ids.has("GHA-06") && usable.length > 0 && !enforcement.runByProject.has("tls")) {
    lines.push(
      "  tls:",
      "    name: peer-ai / tls",
      "    runs-on: ubuntu-latest",
      ...(reports(["GHA-06"]) ? [REPORTS] : []),
      SCHEDULED,
      "    permissions: {}",
      "    steps:",
      `      - name: Check GHA-06 with SSLyze ${IMAGES.sslyze.tag}, against Mozilla's intermediate profile`,
      `        run: docker run --rm ${imageRef(IMAGES.sslyze)} --mozilla_config=intermediate ${usable.map((address) => quote(address.host)).join(" ")}`,
    );
  }
  // Only an environment the config marks as not production is scanned: one it doesn't mark might be.
  const staging = usable.filter((address) => address.production === false);
  if (ids.has("GHA-07") && staging.length > 0 && !enforcement.runByProject.has("running-app")) {
    lines.push(
      "  running-app:",
      "    name: peer-ai / running-app",
      "    runs-on: ubuntu-latest",
      ...(reports(["GHA-07"]) ? [REPORTS] : []),
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
export function workflowBody(config: PeerAiConfig, enforcement: Enforcement = ENFORCING): string | undefined {
  const body = jobs(config, enforcement);
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
export function workflowJobs(config: PeerAiConfig, enforcement: Enforcement = ENFORCING): string[] {
  return [...(workflowBody(config, enforcement) ?? "").matchAll(/^ {2}([a-z-]+):$/gm)]
    .map((match) => match[1] ?? "")
    .filter((id) => !["pull_request", "push", "schedule", "workflow_dispatch"].includes(id));
}

const normalise = (text: string) => text.replaceAll("\r\n", "\n");
const hash = (body: string) => createHash("sha256").update(normalise(body)).digest("hex").slice(0, 16);
const HASH_LINE = /^# peer-ai sha256: ([0-9a-f]{16})$/m;

/** A file render owns: its header, a line recording the body's hash, then the body. */
export const withHash = (header: string[], body: string): string =>
  [...header, `# peer-ai sha256: ${hash(body)}`, body].join("\n");

/** The whole file render writes: a header recording the body's hash, then the body. */
export function workflowFile(config: PeerAiConfig, enforcement: Enforcement = ENFORCING): string | undefined {
  const body = workflowBody(config, enforcement);
  if (body === undefined) return undefined;
  return withHash(
    [
      "# Generated by peer-ai render from peer-ai.config.json: the checks of the github-actions stack profile.",
      "# Change the config, not this file. Render writes it again while it's as render left it, and leaves",
      body.includes(REPORTS)
        ? "# it alone once someone changes it by hand. A job with continue-on-error only reports for now, in the\n# report stage or for a deferred rule (RFC 0011): make a job a required check once it enforces."
        : "# it alone once someone changes it by hand. Make each job a required check: their names never change.",
    ],
    body,
  );
}

/** What the workflow does, for render to say: each job, whether it only reports, and what's covered elsewhere. */
export function workflowSummary(config: PeerAiConfig, enforcement: Enforcement = ENFORCING): string | undefined {
  const body = workflowBody(config, enforcement);
  if (body === undefined) return undefined;
  const rules = enforcedRules(config, enforcement);
  const parts = workflowJobs(config, enforcement).map((id) => {
    const ids = rules
      .filter(
        (rule) =>
          (rule.enforcer?.tool === "github-actions" && rule.enforcer.job === id) ||
          ({ tls: "GHA-06", "running-app": "GHA-07" } as Record<string, string>)[id] === rule.id,
      )
      .map((rule) => rule.id);
    const reports = ids.some((rule) => reportsOnly(enforcement.adoption, rule));
    return `${id} (${ids.join(", ")})${reports ? ", reporting only" : ""}`;
  });
  const elsewhere = [
    ...[...enforcement.runByProject].map(([job, where]) => `${job} is covered by ${where}`),
    ...[...enforcement.adoption.coveredBy.values()].map((covered) => `${covered.rule} is covered by ${covered.by}`),
  ];
  return `It runs ${parts.join("; ")}.${elsewhere.length === 0 ? "" : ` ${elsewhere.join("; ")}.`}`;
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
