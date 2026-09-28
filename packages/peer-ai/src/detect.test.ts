import { basename } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detect, slugify } from "./detect.ts";
import { cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const pkg = (content: Record<string, unknown>) => JSON.stringify(content);
const slugifiedName = (root: string) => slugify(basename(root));

describe("detect", () => {
  it("treats an empty folder as a new project and guesses nothing", () => {
    const root = project();
    const found = detect(root);
    expect(found.origin).toBe("new");
    expect(found.tracks).toEqual([]);
    expect(found.name).toBe(basename(root));
    expect(found.repo).toEqual({ remote: null });
    expect(found.hasConfig).toBe(false);
  });

  it("finds every part of a monorepo, and not the workspace root itself", () => {
    const root = project({
      "package.json": pkg({ name: "@acme/monorepo", private: true }),
      "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      "apps/web/package.json": pkg({ dependencies: { react: "19.0.0" }, devDependencies: { typescript: "6.0.0" } }),
      "apps/mobile/package.json": pkg({ dependencies: { expo: "57.0.0", "react-native": "0.86.0", react: "19.0.0" } }),
      "apps/mobile/tsconfig.json": "{}",
      "services/api/pyproject.toml": '[project]\nname = "api"\ndependencies = ["fastapi"]\n',
      "packages/core/package.json": pkg({ name: "@acme/core" }),
      "infra/main.tf": 'resource "x" "y" {}\n',
    });
    const found = detect(root);
    expect(found.name).toBe("monorepo");
    expect(found.origin).toBe("existing");
    expect(found.tracks).toEqual([
      { id: "mobile", path: "apps/mobile", kind: "mobile", stack: ["typescript", "expo", "react-native", "react"] },
      { id: "web", path: "apps/web", kind: "web", stack: ["typescript", "react"] },
      { id: "core", path: "packages/core", kind: "library", stack: ["javascript"] },
      { id: "api", path: "services/api", kind: "backend", stack: ["python", "fastapi"] },
      { id: "infra", path: "infra", kind: "infrastructure", stack: ["terraform"] },
    ]);
  });

  it("finds a single app at the repository root, named after its package", () => {
    const root = project({
      "package.json": pkg({
        name: "storefront",
        description: "Our shop",
        dependencies: { next: "16.0.0", react: "19.0.0" },
      }),
      "tsconfig.json": "{}",
    });
    const found = detect(root);
    expect(found.description).toBe("Our shop");
    expect(found.tracks).toEqual([{ id: "storefront", kind: "web", stack: ["typescript", "next", "react"] }]);
  });

  it("recognises stacks beyond JavaScript", () => {
    const root = project({
      "apps/shopper/pubspec.yaml": "name: shopper\ndependencies:\n  flutter:\n    sdk: flutter\n",
      "apps/shopper/lib/main.dart": "void main() {}\n",
      "apps/driver/build.gradle.kts": 'plugins { id("com.android.application") }\n',
      "services/orders/go.mod": "module orders\n",
      "services/billing/pom.xml": "<project><artifactId>spring-boot-starter</artifactId></project>",
    });
    const kinds = Object.fromEntries(detect(root).tracks.map((track) => [track.id, [track.kind, ...track.stack]]));
    expect(kinds).toEqual({
      driver: ["mobile", "kotlin", "android"],
      shopper: ["mobile", "dart", "flutter"],
      billing: ["backend", "java", "spring"],
      orders: ["backend", "go"],
    });
  });

  it("gives a part the TypeScript installed once at the monorepo root", () => {
    const root = project({
      "package.json": pkg({ private: true, workspaces: ["apps/*"], devDependencies: { typescript: "6.0.0" } }),
      "apps/web/package.json": pkg({ dependencies: { react: "19.0.0", vite: "8.0.0" } }),
    });
    expect(detect(root).tracks).toEqual([
      { id: "web", path: "apps/web", kind: "web", stack: ["typescript", "react", "vite"] },
    ]);
  });

  it("tells a Flutter app from a shared Flutter package", () => {
    const flutter = "name: x\ndependencies:\n  flutter:\n    sdk: flutter\n";
    const root = project({
      "apps/customer/pubspec.yaml": flutter,
      "apps/customer/lib/main.dart": "void main() {}",
      "packages/ui/pubspec.yaml": flutter,
      "packages/ui/lib/ui.dart": "",
    });
    const kinds = Object.fromEntries(detect(root).tracks.map((track) => [track.id, track.kind]));
    expect(kinds).toEqual({ customer: "mobile", ui: "library" });
  });

  it("finds Terraform and Docker a level down in an infrastructure folder, but not a root docker-compose", () => {
    const root = project({
      "docker-compose.yml": "services: {}\n",
      "infra/terraform/main.tf": 'resource "x" "y" {}\n',
      "infra/docker/api.Dockerfile": "FROM node\n",
    });
    expect(detect(root).tracks).toEqual([
      { id: "infra", path: "infra", kind: "infrastructure", stack: ["terraform", "docker"] },
    ]);
  });

  it("finds infrastructure as code by its files, in any infrastructure folder", () => {
    const root = project({
      "deploy/chart/Chart.yaml": "apiVersion: v2\n",
      "k8s/api.yaml": "kind: Deployment\n",
      "pulumi/Pulumi.yaml": "name: stack\n",
    });
    expect(detect(root).tracks.map((track) => [track.id, ...track.stack])).toEqual([
      ["deploy", "helm"],
      ["k8s", "kubernetes"],
      ["pulumi", "pulumi"],
    ]);
  });

  it("recognises a repository that is itself an infrastructure project", () => {
    const root = project({ "main.tf": 'resource "x" "y" {}\n', "variables.tf": "" });
    expect(detect(root).tracks).toEqual([{ id: slugifiedName(root), kind: "infrastructure", stack: ["terraform"] }]);
  });

  it("recognises infrastructure written in code, such as the AWS CDK", () => {
    const root = project({
      "packages/infra/package.json": pkg({
        dependencies: { "aws-cdk-lib": "2.0.0" },
        devDependencies: { typescript: "6.0.0" },
      }),
      "packages/infra/cdk.json": "{}",
    });
    expect(detect(root).tracks).toEqual([
      { id: "infra", path: "packages/infra", kind: "infrastructure", stack: ["typescript", "aws-cdk"] },
    ]);
  });

  it("records where each part deploys, on that part", () => {
    const root = project({
      "apps/web/package.json": pkg({ dependencies: { next: "16.0.0" } }),
      "apps/web/vercel.json": "{}",
      "apps/mobile/package.json": pkg({ dependencies: { expo: "57.0.0" } }),
      "apps/mobile/eas.json": "{}",
      "services/api/requirements.txt": "fastapi\n",
      "services/api/fly.toml": "app = 'api'\n",
      "services/worker/go.mod": "module worker\n",
      "services/worker/Dockerfile": "FROM golang\n",
      "packages/ui/package.json": pkg({ name: "ui" }),
      "packages/ui/Dockerfile": "FROM node\n",
    });
    const deploys = Object.fromEntries(detect(root).tracks.map((track) => [track.id, track.deploy]));
    expect(deploys).toEqual({ mobile: "expo-eas", web: "vercel", ui: undefined, api: "fly", worker: "container" });
  });

  it("finds an existing CI pipeline, and reports none when there isn't one", () => {
    expect(detect(project({ ".github/workflows/ci.yml": "on: push\n" })).delivery).toEqual({
      ci: "existing",
      pipeline: ".github/workflows/",
    });
    expect(detect(project({ ".gitlab-ci.yml": "stages: []\n" })).delivery?.pipeline).toBe(".gitlab-ci.yml");
    expect(detect(project({ ".github/workflows/": "" })).delivery).toBeUndefined();
    expect(detect(project()).delivery).toBeUndefined();
  });

  it("finds the AI tools a repository is already set up for", () => {
    const root = project({ "CLAUDE.md": "# rules", ".cursor/": "", ".github/copilot-instructions.md": "x" });
    expect(detect(root).tools).toEqual(["claude-code", "cursor", "copilot"]);
  });

  it("reads the git host from the origin remote", () => {
    expect(detect(project({}, { gitRemote: "git@github.com:acme/app.git" })).repo).toEqual({
      host: "github",
      remote: "origin",
    });
    expect(detect(project({}, { gitRemote: "https://gitlab.com/acme/app.git" })).repo.host).toBe("gitlab");
  });

  it("notices an existing config", () => {
    expect(detect(project({ "peer-ai.config.json": "{}" })).hasConfig).toBe(true);
  });
});

describe("slugify", () => {
  it("makes a valid track id from any name", () => {
    expect(slugify("@acme/Web App")).toBe("web-app");
    expect(slugify("2024-site")).toBe("app-2024-site");
    expect(slugify("!!!")).toBe("app");
  });
});
