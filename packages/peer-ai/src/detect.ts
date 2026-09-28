// Reads a repository and works out what it can without asking: the project's name, whether
// it is new or existing, which AI tools are set up, the git host, and the parts it is made of.
// Everything found here is a proposal; `init` shows it to the user before writing anything.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { ToolId } from "@peer-ai/workflow";

export const CONFIG_FILE = "peer-ai.config.json";

export type TrackKind = "web" | "mobile" | "desktop" | "backend" | "infrastructure" | "library" | "cli" | "other";
export type RepoHost = "github" | "gitlab" | "bitbucket" | "azure-devops" | "other";

export interface DetectedTrack {
  id: string;
  kind: TrackKind;
  path?: string;
  stack: string[];
}

export interface Detected {
  name: string;
  description?: string;
  origin: "new" | "existing";
  tools: ToolId[];
  repo: { host?: RepoHost; remote: string | null };
  tracks: DetectedTrack[];
  hasConfig: boolean;
}

const PROJECT_MARKERS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "pubspec.yaml",
  "Gemfile",
  "composer.json",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "src",
  "app",
  "lib",
];
const WORKSPACE_DIRS = ["apps", "packages", "services", "libs"];
const STANDALONE_DIRS = ["infra", "infrastructure", "terraform"];

// Order matters: the first match decides the kind, so mobile and desktop frameworks come
// before the web frameworks they are built on.
const NODE_FRAMEWORKS: [dependency: string, tag: string, kind: TrackKind][] = [
  ["expo", "expo", "mobile"],
  ["react-native", "react-native", "mobile"],
  ["electron", "electron", "desktop"],
  ["@tauri-apps/api", "tauri", "desktop"],
  ["next", "next", "web"],
  ["nuxt", "nuxt", "web"],
  ["@sveltejs/kit", "sveltekit", "web"],
  ["@angular/core", "angular", "web"],
  ["astro", "astro", "web"],
  ["vue", "vue", "web"],
  ["svelte", "svelte", "web"],
  ["react", "react", "web"],
  ["vite", "vite", "web"],
  ["@nestjs/core", "nest", "backend"],
  ["express", "express", "backend"],
  ["fastify", "fastify", "backend"],
  ["hono", "hono", "backend"],
  ["koa", "koa", "backend"],
];

const isDir = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();
const readText = (path: string): string => (existsSync(path) ? readFileSync(path, "utf8") : "");

function readJson(path: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function dependencyNames(pkg: Record<string, unknown>): string[] {
  const sections = [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies];
  return sections.flatMap((section) => (typeof section === "object" && section !== null ? Object.keys(section) : []));
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/^@[^/]+\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[a-z]/.test(slug) ? slug : slug === "" ? "app" : `app-${slug}`;
}

function hasTypescript(dir: string): boolean {
  const pkg = readJson(join(dir, "package.json"));
  return (
    (pkg !== undefined && dependencyNames(pkg).includes("typescript")) ||
    existsSync(join(dir, "tsconfig.json")) ||
    existsSync(join(dir, "tsconfig.base.json"))
  );
}

/** Folder names found in a directory and its immediate subdirectories. */
function filesTwoLevels(dir: string): string[] {
  if (!isDir(dir)) return [];
  return readdirSync(dir).flatMap((entry) =>
    isDir(join(dir, entry)) && !entry.startsWith(".") ? [entry, ...readdirSync(join(dir, entry))] : [entry],
  );
}

// In a monorepo, TypeScript is often installed once at the root rather than in each part.
function detectNodeTrack(dir: string, inheritsTypescript: boolean): Omit<DetectedTrack, "id" | "path"> | undefined {
  const pkg = readJson(join(dir, "package.json"));
  if (pkg === undefined) return undefined;
  const deps = dependencyNames(pkg);
  const stack: string[] = [];
  if (inheritsTypescript || hasTypescript(dir)) stack.push("typescript");
  let kind: TrackKind | undefined;
  for (const [dependency, tag, frameworkKind] of NODE_FRAMEWORKS) {
    if (!deps.includes(dependency)) continue;
    stack.push(tag);
    kind ??= frameworkKind;
  }
  kind ??= pkg.bin === undefined ? "library" : "cli";
  if (!stack.includes("typescript")) stack.unshift("javascript");
  return { kind, stack };
}

function detectTrack(dir: string, inheritsTypescript = false): Omit<DetectedTrack, "id" | "path"> | undefined {
  const node = detectNodeTrack(dir, inheritsTypescript);
  if (node !== undefined) return node;

  const python = `${readText(join(dir, "pyproject.toml"))}\n${readText(join(dir, "requirements.txt"))}`.toLowerCase();
  if (python.trim() !== "") {
    const framework = ["fastapi", "django", "flask"].find((name) => python.includes(name));
    return framework === undefined
      ? { kind: "library", stack: ["python"] }
      : { kind: "backend", stack: ["python", framework] };
  }

  const pubspec = readText(join(dir, "pubspec.yaml"));
  if (pubspec !== "") {
    if (!pubspec.includes("flutter")) return { kind: "library", stack: ["dart"] };
    // A Flutter app has an entry point or platform folders; a Flutter package has neither.
    const isApp = ["lib/main.dart", "android", "ios"].some((path) => existsSync(join(dir, path)));
    return { kind: isApp ? "mobile" : "library", stack: ["dart", "flutter"] };
  }

  const gradle = readText(join(dir, "build.gradle.kts")) + readText(join(dir, "build.gradle"));
  const maven = readText(join(dir, "pom.xml"));
  if (gradle !== "" || maven !== "") {
    const language = existsSync(join(dir, "build.gradle.kts")) ? "kotlin" : "java";
    if (gradle.includes("com.android.application")) return { kind: "mobile", stack: ["kotlin", "android"] };
    const spring = (gradle + maven).includes("spring");
    return { kind: "backend", stack: spring ? [language, "spring"] : [language] };
  }

  if (existsSync(join(dir, "go.mod"))) return { kind: "backend", stack: ["go"] };
  if (existsSync(join(dir, "Cargo.toml"))) return { kind: "other", stack: ["rust"] };
  if (readText(join(dir, "Gemfile")).includes("rails")) return { kind: "backend", stack: ["ruby", "rails"] };
  if (readText(join(dir, "composer.json")).includes("laravel")) return { kind: "backend", stack: ["php", "laravel"] };
  return undefined;
}

// Only folders named like infrastructure are checked for it, so a docker-compose file used
// for local development at the root is not mistaken for an infrastructure part.
function detectInfrastructure(dir: string): Omit<DetectedTrack, "id" | "path"> | undefined {
  const files = filesTwoLevels(dir);
  const stack = [
    ...(files.some((file) => file.endsWith(".tf")) ? ["terraform"] : []),
    ...(files.some((file) => /^(Dockerfile|docker-compose.*\.ya?ml)$|\.Dockerfile$/.test(file)) ? ["docker"] : []),
  ];
  return stack.length === 0 ? undefined : { kind: "infrastructure", stack };
}

function isWorkspaceRoot(root: string): boolean {
  if (["pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json"].some((file) => existsSync(join(root, file)))) {
    return true;
  }
  return readJson(join(root, "package.json"))?.workspaces !== undefined;
}

export function detectName(root: string): string {
  const pkgName = readJson(join(root, "package.json"))?.name;
  if (typeof pkgName === "string" && pkgName !== "") return pkgName.replace(/^@[^/]+\//, "");
  const pyName = /^\s*name\s*=\s*"([^"]+)"/m.exec(readText(join(root, "pyproject.toml")))?.[1];
  return pyName ?? basename(root);
}

export function detectTracks(root: string, projectName: string): DetectedTrack[] {
  const candidates: string[] = [];
  for (const workspace of WORKSPACE_DIRS) {
    if (!isDir(join(root, workspace))) continue;
    for (const child of readdirSync(join(root, workspace)).sort()) {
      if (!child.startsWith(".") && isDir(join(root, workspace, child))) candidates.push(`${workspace}/${child}`);
    }
  }
  for (const dir of STANDALONE_DIRS) if (isDir(join(root, dir))) candidates.push(dir);

  const found: { path?: string; track: Omit<DetectedTrack, "id" | "path">; name: string }[] = [];
  if (!isWorkspaceRoot(root)) {
    const rootTrack = detectTrack(root);
    if (rootTrack !== undefined) found.push({ track: rootTrack, name: projectName });
  }
  const rootTypescript = hasTypescript(root);
  for (const path of candidates) {
    const dir = join(root, path);
    const track = STANDALONE_DIRS.includes(path)
      ? (detectInfrastructure(dir) ?? detectTrack(dir, rootTypescript))
      : detectTrack(dir, rootTypescript);
    if (track !== undefined) found.push({ path, track, name: basename(path) });
  }

  const used = new Set<string>();
  return found.map(({ path, track, name }) => {
    let id = slugify(name);
    for (let n = 2; used.has(id); n++) id = `${slugify(name)}-${String(n)}`;
    used.add(id);
    return path === undefined ? { id, ...track } : { id, path, ...track };
  });
}

export function detectTools(root: string): ToolId[] {
  const tools: ToolId[] = [];
  if (existsSync(join(root, "CLAUDE.md")) || isDir(join(root, ".claude"))) tools.push("claude-code");
  if (isDir(join(root, ".codex"))) tools.push("codex");
  if (isDir(join(root, ".cursor")) || existsSync(join(root, ".cursorrules"))) tools.push("cursor");
  if (existsSync(join(root, ".github", "copilot-instructions.md"))) tools.push("copilot");
  if (existsSync(join(root, "GEMINI.md")) || isDir(join(root, ".gemini"))) tools.push("gemini-cli");
  return tools;
}

export function detectRepo(root: string): Detected["repo"] {
  let url: string;
  try {
    url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return { remote: null };
  }
  const host: RepoHost = url.includes("github.com")
    ? "github"
    : url.includes("gitlab.com")
      ? "gitlab"
      : url.includes("bitbucket.org")
        ? "bitbucket"
        : url.includes("dev.azure.com") || url.includes("visualstudio.com")
          ? "azure-devops"
          : "other";
  return { host, remote: "origin" };
}

export function detect(root: string): Detected {
  const name = detectName(root);
  const tracks = detectTracks(root, name);
  const description = readJson(join(root, "package.json"))?.description;
  const existing = tracks.length > 0 || PROJECT_MARKERS.some((marker) => existsSync(join(root, marker)));
  return {
    name,
    ...(typeof description === "string" && description !== "" ? { description } : {}),
    origin: existing ? "existing" : "new",
    tools: detectTools(root),
    repo: detectRepo(root),
    tracks,
    hasConfig: existsSync(join(root, CONFIG_FILE)),
  };
}
