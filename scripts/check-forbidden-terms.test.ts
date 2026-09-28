import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TERMS_ENV, main, parseTerms } from "./check-forbidden-terms.ts";

const repos: string[] = [];

function repo(files: Record<string, string | Buffer>, message = "initial commit"): string {
  const root = mkdtempSync(join(tmpdir(), "forbidden-terms-"));
  repos.push(root);
  const run = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  run("init", "-q", "-b", "main");
  run("config", "user.name", "Test");
  run("config", "user.email", "test@example.com");
  run("config", "commit.gpgsign", "false");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  run("add", "-A");
  run("commit", "-q", "--allow-empty", "-m", message);
  return root;
}

function commit(root: string, files: Record<string, string>, message: string): void {
  for (const [path, content] of Object.entries(files)) writeFileSync(join(root, path), content);
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", message], { cwd: root });
}

function check(root: string, env: NodeJS.ProcessEnv, extraArgs: string[] = []) {
  const lines: string[] = [];
  const code = main(["--root", root, ...extraArgs], env, {
    log: (line) => lines.push(line),
    error: (line) => lines.push(line),
  });
  return { code, output: lines.join("\n") };
}

afterEach(() => {
  for (const root of repos.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("parseTerms", () => {
  it("splits on newlines and commas, trims, and drops blanks and comments", () => {
    expect(parseTerms("Acme Corp, Globex\n  # a comment\n\nInitech \n")).toEqual(["Acme Corp", "Globex", "Initech"]);
  });
});

describe("the forbidden-terms check", () => {
  it("fails, rather than passing, when no terms are configured", () => {
    const root = repo({ "README.md": "hello" });
    const { code, output } = check(root, {});
    expect(code).toBe(2);
    expect(output).toContain("nothing was checked");
  });

  it("passes a clean repository", () => {
    const root = repo({ "README.md": "A neutral example about a to-do app." });
    expect(check(root, { [TERMS_ENV]: "Globex" }).code).toBe(0);
  });

  it("reports a term in file content by position, case-insensitively, without printing the term", () => {
    const root = repo({ "docs/notes.md": "line one\nbuilt for GLOBEX last year\n" });
    const { code, output } = check(root, { [TERMS_ENV]: "Acme, globex" });
    expect(code).toBe(1);
    expect(output).toContain("term #2 found in content docs/notes.md:2:11");
    expect(output.toLowerCase()).not.toContain("globex");
  });

  it("reports a term in a file path", () => {
    const root = repo({ "fixtures/globex-app/README.md": "neutral" });
    expect(check(root, { [TERMS_ENV]: "globex" }).output).toContain(
      "term #1 found in path fixtures/globex-app/README.md",
    );
  });

  it("reads the local terms file when the environment variable is absent", () => {
    const root = repo({ "README.md": "made for Initech" });
    writeFileSync(join(root, ".forbidden-terms"), "Initech\n");
    expect(check(root, {}).code).toBe(1);
  });

  it("refuses to run when the terms file itself is tracked", () => {
    const root = repo({ ".forbidden-terms": "Initech\n", "README.md": "neutral" });
    const { code, output } = check(root, {});
    expect(code).toBe(2);
    expect(output).toContain("is tracked by git");
  });

  it("skips binary files and does not follow symlinks", () => {
    const root = repo({ "logo.png": Buffer.from([0x89, 0x50, 0x00, 0x67, 0x6c, 0x6f, 0x62, 0x65, 0x78]) });
    writeFileSync(join(root, "outside.txt"), "globex");
    symlinkSync(join(root, "outside.txt"), join(root, "link.txt"));
    execFileSync("git", ["add", "link.txt"], { cwd: root });
    execFileSync("git", ["commit", "-q", "-m", "add link"], { cwd: root });
    expect(check(root, { [TERMS_ENV]: "globex" }).code).toBe(0);
  });

  it("checks commit messages in the given range", () => {
    const root = repo({ "README.md": "neutral" });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    commit(root, { "README.md": "still neutral" }, "Fix the Globex login bug");
    const { code, output } = check(root, { [TERMS_ENV]: "globex" }, ["--range", `${base}..HEAD`]);
    expect(code).toBe(1);
    expect(output).toMatch(/term #1 found in commit [0-9a-f]{12}/);
  });

  it("checks every commit message reachable from a single revision", () => {
    const root = repo({ "README.md": "neutral" }, "Kick-off for Globex");
    commit(root, { "README.md": "still neutral" }, "a neutral message");
    const { code, output } = check(root, { [TERMS_ENV]: "globex" }, ["--range", "HEAD"]);
    expect(code).toBe(1);
    expect(output).toMatch(/term #1 found in commit [0-9a-f]{12}/);
  });

  it("reports an unreadable range as an incomplete scan, not as clean or as a finding", () => {
    const root = repo({ "README.md": "neutral" });
    const { code, output } = check(root, { [TERMS_ENV]: "globex" }, [
      "--range",
      "0123456789abcdef0123456789abcdef01234567..HEAD",
    ]);
    expect(code).toBe(2);
    expect(output).toContain("could not complete");
  });

  it("rejects unknown arguments", () => {
    const root = repo({ "README.md": "neutral" });
    expect(check(root, { [TERMS_ENV]: "globex" }, ["--bogus"]).code).toBe(2);
  });
});
