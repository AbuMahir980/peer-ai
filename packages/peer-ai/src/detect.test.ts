import { basename } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyHost, detect, remoteHostname, slugify } from "./detect.ts";
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

  it("recognises Node backend frameworks", () => {
    const root = project({
      "services/gateway/package.json": pkg({ dependencies: { express: "5.1.0" } }),
      "services/orders/package.json": pkg({
        dependencies: { "@nestjs/core": "11.1.0", "@nestjs/platform-express": "11.1.0" },
        devDependencies: { typescript: "6.0.0" },
      }),
      "services/search/package.json": pkg({ dependencies: { fastify: "5.4.0" } }),
    });
    const kinds = Object.fromEntries(detect(root).tracks.map((track) => [track.id, [track.kind, ...track.stack]]));
    expect(kinds).toEqual({
      gateway: ["backend", "javascript", "express"],
      orders: ["backend", "typescript", "nest"],
      search: ["backend", "javascript", "fastify"],
    });
  });

  it("recognises a backend in any major language by its framework, and a library without one", () => {
    const root = project({
      "services/admin/composer.json": pkg({ require: { "symfony/framework-bundle": "7.3.0" } }),
      "services/billing/build.gradle.kts": 'plugins { id("io.ktor.plugin") }\n',
      "services/catalog/Cargo.toml": '[package]\nname = "catalog"\n\n[dependencies]\naxum = "0.8"\n',
      "services/chat/mix.exs": 'defp deps do\n  [{:phoenix, "~> 1.8"}]\nend\n',
      "services/ledger/Ledger.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
      "services/notes/Package.swift":
        'dependencies: [.package(url: "https://github.com/vapor/vapor.git", from: "4.0.0")]',
      "services/orders/go.mod": "module example.test/orders\n\nrequire github.com/gin-gonic/gin v1.10.0\n",
      "services/shop/Gemfile": 'source "https://rubygems.org"\ngem "sinatra"\n',
      "services/importer/Cargo.toml": '[package]\nname = "importer"\n\n[dependencies]\nclap = "4"\n',
      "packages/money/Gemfile": 'source "https://rubygems.org"\ngem "bigdecimal"\n',
    });
    const kinds = Object.fromEntries(detect(root).tracks.map((track) => [track.id, [track.kind, ...track.stack]]));
    expect(kinds).toEqual({
      admin: ["backend", "php", "symfony"],
      billing: ["backend", "kotlin", "ktor"],
      catalog: ["backend", "rust", "axum"],
      chat: ["backend", "elixir", "phoenix"],
      ledger: ["backend", "csharp", "dotnet", "aspnet"],
      notes: ["backend", "swift", "vapor"],
      orders: ["backend", "go", "gin"],
      shop: ["backend", "ruby", "sinatra"],
      importer: ["other", "rust"],
      money: ["library", "ruby"],
    });
  });

  it("recognises .NET web and mobile apps, and an iOS app by its Xcode project", () => {
    const root = project({
      "apps/portal/Portal.csproj": '<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly"></Project>',
      "apps/field/Field.csproj":
        '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><UseMaui>true</UseMaui></PropertyGroup></Project>',
      "apps/notes/Notes.xcodeproj/project.pbxproj": "",
      "packages/shared/Shared.csproj": '<Project Sdk="Microsoft.NET.Sdk"></Project>',
    });
    const kinds = Object.fromEntries(detect(root).tracks.map((track) => [track.id, [track.kind, ...track.stack]]));
    expect(kinds).toEqual({
      field: ["mobile", "csharp", "dotnet", "maui"],
      notes: ["mobile", "swift", "ios"],
      portal: ["web", "csharp", "dotnet", "blazor"],
      shared: ["library", "csharp", "dotnet"],
    });
  });

  it.each([
    ["pyproject.toml", '[project]\nname = "courier-api"\n', "courier-api"],
    ["Cargo.toml", '[package]\nname = "catalog"\nversion = "0.1.0"\n', "catalog"],
    ["go.mod", "module github.com/example/orders/v2\n", "orders"],
    ["composer.json", pkg({ name: "example/admin" }), "admin"],
    ["pubspec.yaml", "name: shopper\n", "shopper"],
    ["settings.gradle.kts", 'rootProject.name = "billing"\n', "billing"],
  ])("names the project from %s", (file, content, name) => {
    expect(detect(project({ [file]: content })).name).toBe(name);
  });

  it("reads the description from pyproject.toml or Cargo.toml when there's no package.json", () => {
    const root = project({ "Cargo.toml": '[package]\nname = "catalog"\ndescription = "Product catalogue"\n' });
    expect(detect(root).description).toBe("Product catalogue");
  });

  it("treats a Go or Cargo workspace root as a workspace, not an app", () => {
    const go = project({
      "go.work": "go 1.25\n\nuse ./services/orders\n",
      "go.mod": "module example.test/tools\n",
      "services/orders/go.mod": "module example.test/orders\n",
    });
    expect(detect(go).tracks.map((track) => track.id)).toEqual(["orders"]);
    const cargo = project({
      "Cargo.toml": '[workspace]\nmembers = ["services/*"]\n',
      "services/catalog/Cargo.toml": '[package]\nname = "catalog"\n',
    });
    expect(detect(cargo).tracks.map((track) => track.id)).toEqual(["catalog"]);
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

  it("finds infrastructure nested several folders down", () => {
    const root = project({ "infra/terraform/envs/production/main.tf": 'resource "x" "y" {}\n' });
    expect(detect(root).tracks).toEqual([{ id: "infra", path: "infra", kind: "infrastructure", stack: ["terraform"] }]);
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

describe("reading the git host", () => {
  it.each([
    ["git@github.com:acme/app.git", "github"],
    ["https://github.com/acme/app.git", "github"],
    ["ssh://git@ssh.github.com:443/acme/app.git", "github"],
    ["https://gitlab.com/acme/app.git", "gitlab"],
    ["git@gitlab.acme.io:team/app.git", "other"],
    ["git@bitbucket.org:acme/app.git", "bitbucket"],
    ["https://acme@dev.azure.com/acme/project/_git/app", "azure-devops"],
    ["git@ssh.dev.azure.com:v3/acme/project/app", "azure-devops"],
    ["https://acme.visualstudio.com/project/_git/app", "azure-devops"],
    ["https://evil.example/github.com/acme/app.git", "other"],
    ["https://github.com.evil.example/acme/app.git", "other"],
    ["not a url", "other"],
  ])("classifies %s as %s", (url, host) => {
    expect(classifyHost(remoteHostname(url))).toBe(host);
  });
});

describe("slugify", () => {
  it("makes a valid track id from any name", () => {
    expect(slugify("@acme/Web App")).toBe("web-app");
    expect(slugify("2024-site")).toBe("app-2024-site");
    expect(slugify("!!!")).toBe("app");
  });
});
