// Reads a repository and works out what it can without asking: the project's name, whether
// it is new or existing, which AI tools are set up, the git host, its CI, and the parts it is
// made of, with where each one deploys. Everything found here is a proposal; `init` shows it
// to the user before writing anything, and nothing that isn't found is assumed.

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
  /** Where it deploys, when a platform's config file says so. */
  deploy?: string;
}

export interface Detected {
  name: string;
  description?: string;
  origin: "new" | "existing";
  tools: ToolId[];
  repo: { host?: RepoHost; remote: string | null };
  /** Present when a CI pipeline already exists, so Peer AI extends it instead of adding another. */
  delivery?: { ci: "existing"; pipeline: string };
  tracks: DetectedTrack[];
  hasConfig: boolean;
}

type Found = Omit<DetectedTrack, "id" | "path">;

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
const INFRA_DIRS = [
  "infra",
  "infrastructure",
  "terraform",
  "deploy",
  "deployment",
  "deployments",
  "ops",
  "devops",
  "k8s",
  "kubernetes",
  "helm",
  "charts",
  "cdk",
  "pulumi",
];

// Order matters: the first match decides the kind, so infrastructure, mobile and desktop
// frameworks come before the web frameworks they may be built with.
const NODE_FRAMEWORKS: [dependency: string, tag: string, kind: TrackKind][] = [
  ["aws-cdk-lib", "aws-cdk", "infrastructure"],
  ["cdktf", "cdktf", "infrastructure"],
  ["@pulumi/pulumi", "pulumi", "infrastructure"],
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

// Infrastructure as code, recognised by its files rather than by where it lives.
const IAC_SIGNATURES: [matches: (file: string) => boolean, tag: string][] = [
  [(file) => file.endsWith(".tf") || file.endsWith(".tf.json"), "terraform"],
  [(file) => file === "Pulumi.yaml" || file === "Pulumi.yml", "pulumi"],
  [(file) => file === "cdk.json", "aws-cdk"],
  [(file) => file === "Chart.yaml", "helm"],
  [(file) => file === "kustomization.yaml" || file === "kustomization.yml", "kustomize"],
  [(file) => file === "serverless.yml" || file === "serverless.yaml", "serverless"],
  [(file) => file === "samconfig.toml", "aws-sam"],
  [(file) => /\.cfn\.(ya?ml|json)$/.test(file), "cloudformation"],
  [(file) => file.endsWith(".bicep"), "bicep"],
  [(file) => file === "ansible.cfg" || file === "playbook.yml" || file === "site.yml", "ansible"],
];
const DOCKER_FILE = /^(Dockerfile|docker-compose.*\.ya?ml|compose\.ya?ml)$|\.Dockerfile$/;

// A platform's config file in a part's folder says where that part deploys. More specific
// platforms come first; a bare Dockerfile only says it ships as a container.
const DEPLOY_TARGETS: [file: string, target: string][] = [
  ["vercel.json", "vercel"],
  ["netlify.toml", "netlify"],
  ["fly.toml", "fly"],
  ["render.yaml", "render"],
  ["railway.json", "railway"],
  ["railway.toml", "railway"],
  ["wrangler.toml", "cloudflare-workers"],
  ["wrangler.json", "cloudflare-workers"],
  ["wrangler.jsonc", "cloudflare-workers"],
  ["firebase.json", "firebase"],
  ["amplify.yml", "aws-amplify"],
  ["eas.json", "expo-eas"],
  ["serverless.yml", "serverless"],
  ["serverless.yaml", "serverless"],
  ["Procfile", "heroku"],
  ["app.yaml", "gcp-app-engine"],
  ["fastlane", "fastlane"],
  ["Dockerfile", "container"],
];

const PIPELINES: [path: string, directory: boolean][] = [
  [".github/workflows", true],
  [".gitlab-ci.yml", false],
  ["Jenkinsfile", false],
  ["bitbucket-pipelines.yml", false],
  ["azure-pipelines.yml", false],
  [".circleci", true],
  [".buildkite", true],
  [".drone.yml", false],
  [".travis.yml", false],
  ["cloudbuild.yaml", false],
  ["codemagic.yaml", false],
  ["bitrise.yml", false],
];

const isDir = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();
const readText = (path: string): string => (existsSync(path) ? readFileSync(path, "utf8") : "");
const listDir = (dir: string): string[] => (isDir(dir) ? readdirSync(dir) : []);

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

/** File and folder names in a directory and its immediate subdirectories. */
function filesTwoLevels(dir: string): string[] {
  return listDir(dir).flatMap((entry) =>
    isDir(join(dir, entry)) && !entry.startsWith(".") ? [entry, ...listDir(join(dir, entry))] : [entry],
  );
}

// In a monorepo, TypeScript is often installed once at the root rather than in each part.
function detectNodeTrack(dir: string, inheritsTypescript: boolean): Found | undefined {
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

/** An application or library part, recognised by its language's project files. */
function detectApp(dir: string, inheritsTypescript: boolean): Found | undefined {
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

/**
 * Infrastructure as code. Docker files count only inside an infrastructure folder, so a
 * docker-compose file used for local development is not mistaken for infrastructure.
 */
function detectInfrastructure(dir: string, options: { deep: boolean; includeDocker: boolean }): Found | undefined {
  const files = options.deep ? filesTwoLevels(dir) : listDir(dir);
  const stack = IAC_SIGNATURES.filter(([matches]) => files.some(matches)).map(([, tag]) => tag);
  if (["k8s", "kubernetes"].includes(basename(dir)) && files.some((file) => /\.ya?ml$/.test(file))) {
    stack.push("kubernetes");
  }
  if (options.includeDocker && files.some((file) => DOCKER_FILE.test(file))) stack.push("docker");
  return stack.length === 0 ? undefined : { kind: "infrastructure", stack };
}

export function detectDeploy(dir: string): string | undefined {
  for (const [file, target] of DEPLOY_TARGETS) {
    if (!existsSync(join(dir, file))) continue;
    if (file === "app.yaml" && !readText(join(dir, file)).includes("runtime:")) continue;
    return target;
  }
  return undefined;
}

function withDeploy(track: Found, dir: string): Found {
  if (track.kind === "infrastructure" || track.kind === "library") return track;
  const deploy = detectDeploy(dir);
  return deploy === undefined ? track : { ...track, deploy };
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
  const found: { path?: string; track: Found; name: string }[] = [];

  if (!isWorkspaceRoot(root)) {
    // The root is one app, or a repository that is itself an infrastructure project.
    const app = detectApp(root, false);
    const rootTrack =
      app === undefined ? detectInfrastructure(root, { deep: false, includeDocker: false }) : withDeploy(app, root);
    if (rootTrack !== undefined) found.push({ track: rootTrack, name: projectName });
  }

  const rootTypescript = hasTypescript(root);
  for (const workspace of WORKSPACE_DIRS) {
    for (const child of listDir(join(root, workspace)).sort()) {
      const dir = join(root, workspace, child);
      if (child.startsWith(".") || !isDir(dir)) continue;
      const app = detectApp(dir, rootTypescript);
      const track =
        app === undefined ? detectInfrastructure(dir, { deep: false, includeDocker: false }) : withDeploy(app, dir);
      if (track !== undefined) found.push({ path: `${workspace}/${child}`, track, name: child });
    }
  }
  for (const infra of INFRA_DIRS) {
    const dir = join(root, infra);
    if (!isDir(dir)) continue;
    const track = detectInfrastructure(dir, { deep: true, includeDocker: true }) ?? detectApp(dir, rootTypescript);
    if (track !== undefined) found.push({ path: infra, track, name: infra });
  }

  const used = new Set<string>();
  return found.map(({ path, track, name }) => {
    let id = slugify(name);
    for (let n = 2; used.has(id); n++) id = `${slugify(name)}-${String(n)}`;
    used.add(id);
    return path === undefined ? { id, ...track } : { id, path, ...track };
  });
}

export function detectDelivery(root: string): Detected["delivery"] {
  for (const [path, directory] of PIPELINES) {
    const full = join(root, path);
    const present = directory ? listDir(full).some((file) => /\.ya?ml$/.test(file)) : existsSync(full);
    if (present) return { ci: "existing", pipeline: directory ? `${path}/` : path };
  }
  return undefined;
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

/** The host name of a git remote, from an https, ssh:// or scp-style (git@host:path) URL. */
export function remoteHostname(url: string): string | undefined {
  const scp = /^[^@/\s]+@([^:/\s]+):/.exec(url);
  if (scp?.[1] !== undefined) return scp[1].toLowerCase();
  try {
    return new URL(url).hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

// Matched on the parsed host name against each service's real domain, never on the whole URL,
// so a URL that merely contains "github.com" is not mistaken for GitHub. A self-hosted server
// cannot be recognised reliably from its name, so it is recorded as "other" for the user to set.
export function classifyHost(hostname: string | undefined): RepoHost {
  if (hostname === undefined) return "other";
  const is = (domain: string) => hostname === domain || hostname.endsWith(`.${domain}`);
  if (is("github.com")) return "github";
  if (is("gitlab.com")) return "gitlab";
  if (is("bitbucket.org")) return "bitbucket";
  if (is("dev.azure.com") || is("visualstudio.com")) return "azure-devops";
  return "other";
}

export function detectRepo(root: string): Detected["repo"] {
  let url: string;
  try {
    url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return { remote: null };
  }
  return { host: classifyHost(remoteHostname(url)), remote: "origin" };
}

export function detect(root: string): Detected {
  const name = detectName(root);
  const tracks = detectTracks(root, name);
  const description = readJson(join(root, "package.json"))?.description;
  const delivery = detectDelivery(root);
  const existing = tracks.length > 0 || PROJECT_MARKERS.some((marker) => existsSync(join(root, marker)));
  return {
    name,
    ...(typeof description === "string" && description !== "" ? { description } : {}),
    origin: existing ? "existing" : "new",
    tools: detectTools(root),
    repo: detectRepo(root),
    ...(delivery === undefined ? {} : { delivery }),
    tracks,
    hasConfig: existsSync(join(root, CONFIG_FILE)),
  };
}
