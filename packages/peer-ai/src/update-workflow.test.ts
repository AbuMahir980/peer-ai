import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { capture, cleanUp, project } from "./test-helpers.ts";
import { runRender } from "./render.ts";
import { UPDATE_FILE, updateWorkflow } from "./update-workflow.ts";

afterEach(cleanUp);

/** The workflow's shell script, as the run step holds it. */
function script(workflow: string): string {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line === "        run: |") + 1;
  return lines
    .slice(start)
    .filter((line) => line.startsWith("          "))
    .map((line) => line.slice(10))
    .join("\n");
}

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

/**
 * Runs the script in a repository with a local remote, with npm, npx and gh stood in for: npm
 * answers `latest`, npx's render changes a pinned file, and gh records what it's asked.
 */
function run(latest: string, openPullRequests = "0") {
  const remote = project({});
  git(remote, "init", "-q", "--bare");
  const root = project({ ".mcp.json": '{"args":["-y","peer-ai@1.0.0-next.9","mcp"]}\n' }, { git: true });
  git(root, "symbolic-ref", "HEAD", "refs/heads/main");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "start");
  git(root, "remote", "add", "origin", remote);
  const bin = join(root, ".bin");
  mkdirSync(bin);
  const log = join(root, ".gh-calls");
  const stub = (name: string, body: string) => {
    writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  stub("npm", `echo "${latest}"`);
  stub("npx", `sed -i.bak "s/peer-ai@1.0.0-next.9/$2/" .mcp.json && rm .mcp.json.bak`);
  stub(
    "gh",
    `printf '%s\\n' "$*" >> "${log}"; if [ "$2" = "list" ]; then echo "${openPullRequests}"; else echo "https://github.com/acme/shop/pull/7"; fi`,
  );
  const result = spawnSync("bash", ["-c", script(updateWorkflow("1.0.0-next.9"))], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}`, GH_TOKEN: "test-token", OWN_TOKEN: "true" },
  });
  return { root, remote, result, calls: existsSync(log) ? readFileSync(log, "utf8") : "" };
}

describe.skipIf(process.platform === "win32")("the update pull request (RFC 0014)", () => {
  it("opens one with render already run when a newer Peer AI is out", () => {
    const { remote, result, calls } = run("1.0.0-next.12");
    expect(result.status).toBe(0);
    expect(git(remote, "show", "peer-ai/update-1.0.0-next.12:.mcp.json")).toContain("peer-ai@1.0.0-next.12");
    expect(git(remote, "log", "-1", "--format=%s", "peer-ai/update-1.0.0-next.12")).toBe(
      "chore: update Peer AI to 1.0.0-next.12",
    );
    expect(calls).toContain("pr create --head peer-ai/update-1.0.0-next.12 --title Update Peer AI to 1.0.0-next.12");
    expect(calls).toContain("close and reopen this one to run the checks");
  });

  it("does nothing when the project is current, a pull request is open, or npm gives no version", () => {
    expect(run("1.0.0-next.9").result.stdout).toContain("Peer AI 1.0.0-next.9 is the latest release.");
    const open = run("1.0.0-next.12", "1");
    expect(open.result.stdout).toContain("A pull request for 1.0.0-next.12 is open already.");
    expect(open.calls).not.toContain("pr create");
    const odd = run("1.0.0; rm -rf ~");
    expect(odd.result.status).toBe(1);
    expect(odd.result.stdout).toContain("npm gave no version");
  });

  it("is written by render on GitHub Actions only when asked for, and asks only for what it uses", () => {
    const config = (updates: unknown) =>
      JSON.stringify({
        version: 1,
        project: { name: "Shop" },
        tracks: [{ id: "web", kind: "web", status: "active" }],
        ...(updates === undefined ? {} : { updates }),
      });
    const asked = project({
      "peer-ai.config.json": config({ pullRequest: true }),
      ".github/workflows/ci.yml": "on: push\n",
    });
    runRender({ cwd: asked, check: false, quiet: true }, capture());
    const written = readFileSync(join(asked, UPDATE_FILE), "utf8");
    expect(written).toContain("permissions: {}");
    expect(written).toContain("      contents: write\n      pull-requests: write\n");
    expect(written).toContain("          persist-credentials: false");
    const plain = project({ "peer-ai.config.json": config(undefined), ".github/workflows/ci.yml": "on: push\n" });
    runRender({ cwd: plain, check: false, quiet: true }, capture());
    expect(existsSync(join(plain, UPDATE_FILE))).toBe(false);
    const pinned = project({
      "peer-ai.config.json": config({ pullRequest: true }),
      ".github/workflows/ci.yml": "on: push\n",
      "package.json": JSON.stringify({ devDependencies: { "peer-ai": "1.0.0-next.9" } }),
    });
    const out = capture();
    runRender({ cwd: pinned, check: false }, out);
    expect(existsSync(join(pinned, UPDATE_FILE))).toBe(false);
    expect(out.text()).toContain("left to Dependabot or Renovate");
  });
});
