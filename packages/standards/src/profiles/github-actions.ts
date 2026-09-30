import type { ProfileInput } from "../profile.ts";

// The checks a pipeline runs, on GitHub Actions (RFC 0006, section 4). peer-ai render writes them
// as one workflow. The automatic ones are proven in Peer AI's own CI: each tool is run on the
// failing and passing examples. The TLS check and the scan of the running app need a live
// environment, so a review confirms they ran. Examples are from a made-up bicycle repair booking
// service.

/** A token in GitHub's format, built when the example runs, so no token is written in this file. */
const fakeToken = () => `${["gh", "p_"].join("")}${"R7kQ2mZ9".repeat(4)}ab4d`;

const checkout = (pinned: boolean) =>
  pinned ? "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1" : "actions/checkout@v7";

/** A workflow that builds the app, pinned or not, starting from no permissions, with the job's own. */
function workflow(pinned: boolean, jobPermissions: string[] = ["contents: read"]): string {
  return [
    "name: Build",
    "on: pull_request",
    "permissions: {}",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    ...(jobPermissions.length === 1 && jobPermissions[0] === "write-all"
      ? ["    permissions: write-all"]
      : ["    permissions:", ...jobPermissions.map((line) => `      ${line}`)]),
    "    steps:",
    `      - uses: ${checkout(pinned)}`,
    "        with:",
    "          persist-credentials: false",
    "      - run: make test",
    "",
  ].join("\n");
}

export const githubActions: ProfileInput = {
  id: "github-actions",
  name: "GitHub Actions",
  prefix: "GHA",
  about:
    "The checks a pipeline on GitHub Actions runs on every change: secrets, dependencies with published vulnerabilities, workflows' own safety, and code scanning; and, where the project has environments with addresses, a TLS check and a scan of the running app in staging. `peer-ai render` writes them as one workflow, each tool pinned to a checked release.",
  stacks: [],
  rules: [
    {
      id: "GHA-01",
      title: "Every change is scanned for secrets",
      rule: "Every pull request's commits are scanned for secrets, such as keys and tokens, and the whole history is scanned every day; the check fails when one is found. A secret found in old history that has already been replaced is recorded in `.gitleaksignore`, with why.",
      why: "A secret pushed once stays in the history for anyone with a copy, even after the file is fixed.",
      ask: "Does the pipeline scan every change for secrets, and fail when it finds one?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "SEC-27",
      enforcer: { tool: "github-actions", job: "secrets", finding: "github-pat" },
      examples: {
        file: "settings.py",
        fails: () => `BOOKINGS_TOKEN = "${fakeToken()}"\n`,
        passes: 'import os\n\nBOOKINGS_TOKEN = os.environ["BOOKINGS_TOKEN"]\n',
      },
    },
    {
      id: "GHA-02",
      title: "Dependencies are checked for published vulnerabilities",
      rule: "Every change, and every day, the dependencies in each lockfile and manifest are checked against the published advisories, and the check fails when one is affected.",
      why: "New advisories are published for code that hasn't changed, so a check that runs only on changes misses them.",
      ask: "Does the pipeline check dependencies on every change and every day?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "DEL-03",
      enforcer: { tool: "github-actions", job: "dependencies", finding: "jinja2" },
      examples: { file: "requirements.txt", fails: "jinja2==2.10\n", passes: "six==1.17.0\n" },
    },
    {
      id: "GHA-03",
      title: "Every action is pinned to a commit",
      rule: "Every action a workflow or an action in the repository uses is pinned to a full commit, never to a tag or a branch that can move. A comment with its version helps a reviewer, and isn't checked.",
      why: "A tag can be moved to other code, so a workflow that uses one runs whatever its owner, or whoever took over the account, puts there next.",
      ask: "Is every action in the workflows pinned to a commit?",
      stage: "prototype",
      check: "auto",
      severity: "high",
      carries: "DEL-01",
      enforcer: { tool: "github-actions", job: "workflows", finding: "unpinned-uses" },
      examples: {
        file: ".github/workflows/build.yml",
        fails: workflow(false),
        passes: workflow(true),
      },
    },
    {
      id: "GHA-04",
      title: "No job asks for a token that can write everything",
      rule: "No job asks for `write-all`, the token that can change the code, the releases and the settings.",
      why: "With write-all, one compromised step, such as a hijacked action, can change anything the repository holds.",
      ask: "Does any job in the workflows ask for write-all?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "SEC-28",
      enforcer: { tool: "github-actions", job: "workflows", finding: "excessive-permissions" },
      examples: {
        file: ".github/workflows/build.yml",
        fails: workflow(true, ["write-all"]),
        passes: workflow(true),
      },
    },
    {
      id: "GHA-05",
      title: "Code scanning is a required check",
      rule: "Every change is scanned for insecure code by a code scanner, such as Semgrep with a pinned set of rules, or CodeQL, and the check must pass before the change merges.",
      why: "A scanner finds the patterns a reviewer skims past, in every change, including the ones nobody reviews closely.",
      ask: "Does code scanning run on every change, and must it pass before a merge?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "DEL-04",
      enforcer: { tool: "github-actions", job: "code", finding: "avoid-pickle" },
      examples: {
        file: "app.py",
        fails:
          'import pickle\nimport subprocess\n\nimport yaml\n\n\ndef load_booking(raw: bytes) -> object:\n    return pickle.loads(raw)\n\n\ndef load_settings(text: str) -> object:\n    return yaml.load(text)\n\n\ndef print_label(serial: str) -> None:\n    subprocess.call("lpr " + serial, shell=True)\n',
        passes:
          'import json\nimport subprocess\n\n\ndef load_booking(raw: bytes) -> object:\n    return json.loads(raw)\n\n\ndef print_label(serial: str) -> None:\n    subprocess.run(["lpr", serial], check=True)\n',
      },
    },
    {
      id: "GHA-06",
      title: "Each environment's TLS is checked",
      rule: "On a schedule, each environment with an address is checked against modern TLS settings, such as Mozilla's intermediate profile, and a failure is fixed.",
      why: "TLS settings drift as certificates renew and servers are rebuilt, and nothing else notices until a browser refuses the site.",
      ask: "Does the pipeline check each environment's TLS on a schedule, and did the last run pass?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "SEC-23",
    },
    {
      id: "GHA-07",
      title: "The running app is scanned in staging",
      rule: "On a schedule, and before a release, the running app is scanned, such as by OWASP ZAP's baseline scan, in each environment the config marks as not production, never in production. Each finding is fixed, or accepted by a person in `.github/zap-rules.tsv`, with the reason.",
      why: "Some problems only show in a running app: headers, cookies and pages left open.",
      ask: "Does the pipeline scan the running app in staging, and are its findings fixed or accepted?",
      stage: "production",
      check: "ai-review",
      severity: "medium",
      carries: "DEL-08",
    },
    {
      id: "GHA-08",
      title: "A workflow starts from no permissions, and each job asks for what it uses",
      rule: "A workflow gives its token no permissions by default, with `permissions: {}`, and each job asks for only what it uses, such as `contents: read`.",
      why: "The default token can often write, so a workflow that doesn't say otherwise gives every step more than it needs.",
      ask: "Does every workflow start from no permissions, and does each job ask for only what it uses?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "SEC-28",
    },
  ],
};
