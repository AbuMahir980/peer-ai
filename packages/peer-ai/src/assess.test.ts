import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateMap } from "@peer-ai/workflow";
import { afterEach, describe, expect, it } from "vitest";
import { assess, gaps, loadConfig, runAssess, type AssessOptions } from "./assess.ts";
import { formatReport } from "./report.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");
const json = (value: unknown) => JSON.stringify(value);
const statusOf = (root: string, stage: "prototype" | "mvp" | "production" = "mvp") => {
  const result = assess(root, undefined, stage);
  return Object.fromEntries(Object.entries(result.items).map(([id, item]) => [id, item.status]));
};

const complete = () =>
  project({
    "README.md": "# Shop",
    "docs/01-requirements-summary.md": "",
    "docs/02-architecture.md": "",
    "docs/threat-model.md": "",
    "docs/03-system-spec.md": "",
    "docs/standards/frontend.md": "",
    "docs/data-inventory.md": "",
    "docs/dpia.md": "",
    "docs/slos.md": "",
    "docs/runbooks/api.md": "",
    "apps/web/package.json": json({ dependencies: { react: "19.0.0" } }),
    "apps/web/src/cart.test.tsx": "",
    "services/api/requirements.txt": "fastapi==0.115.6\nsentry-sdk==2.0.0\nstripe==11.0.0\n",
    "services/api/openapi.json": "{}",
    "services/api/tests/test_orders.py": "",
    "services/api/alembic/versions/0001_init.py":
      "sa.Column('email', sa.String)\nsa.Column('phone_number', sa.String)\nsa.Column('card_number', sa.String)\n",
    "design/tokens.json": "{}",
    ".github/workflows/ci.yml": "on: push\n",
    ".env.staging.example": "",
    "infra/main.tf": "",
    "k6/checkout.js": "",
  });

describe("assess", () => {
  it("treats an empty folder as missing almost everything, and not-applicable what it can't have", () => {
    const status = statusOf(project());
    expect(status).toMatchObject({
      requirements: "missing",
      architecture: "missing",
      ci: "missing",
      tests: "missing",
      "api-contract": "not-applicable",
      "data-model": "not-applicable",
      "data-inventory": "not-applicable",
      design: "not-applicable",
    });
  });

  it("finds every item in a well-documented project", () => {
    const status = statusOf(complete(), "production");
    expect(Object.entries(status).filter(([, value]) => value !== "present")).toEqual([]);
    expect(gaps(assess(complete(), undefined, "production"), "production")).toEqual([]);
  });

  it("reads personal data, card data and payment providers from the code", () => {
    const { signals } = assess(complete(), undefined, "mvp");
    expect(signals.personalData.map((finding) => finding.name)).toEqual(["email", "phone_number"]);
    expect(signals.cardData).toEqual([{ name: "card_number", file: "services/api/alembic/versions/0001_init.py" }]);
    expect(signals.paymentProviders).toEqual(["stripe"]);
  });

  it("doesn't ask for an API contract or a data model that belong to another repository", () => {
    const root = project({
      "peer-ai.config.json": json({
        version: 1,
        project: { name: "Reading app" },
        tracks: [
          { id: "app", kind: "mobile", status: "active" },
          { id: "api", kind: "backend", repo: "example/api", status: "external" },
        ],
        apis: [{ id: "reading-api", kind: "http", providedBy: "api" }],
      }),
    });
    const result = assess(root, loadConfig(root).config, "production");
    expect(result.items["api-contract"]).toEqual({
      status: "not-applicable",
      note: "Provided by another repository, where its contract lives: reading-api.",
      inferred: true,
    });
    expect(result.items["data-model"].status).toBe("not-applicable");
    expect(result.tracks.map((track) => track.id)).toEqual(["app", "api"]);
  });

  it("finds a database kept on the device, defined in code, and not just any file called db", () => {
    const dexie = project({ "src/db.ts": 'this.version(1).stores({ plants: "++id, name" });' });
    expect(assess(dexie, undefined, "mvp").items["data-model"]).toEqual({
      status: "present",
      evidence: ["src/db.ts"],
      note: "A database on the device, defined in code.",
    });
    expect(statusOf(project({ "src/storage.js": "const db = await openDB('notes', 1);" }))["data-model"]).toBe(
      "present",
    );
    expect(statusOf(project({ "src/db.ts": "export const db = connect(process.env.URL);" }))["data-model"]).toBe(
      "not-applicable",
    );
  });

  it("finds personal data in prefixed column names, but not inside other words", () => {
    const root = project({
      "db/migrations/0001.sql":
        "CREATE TABLE parcels (recipient_phone TEXT, recipient_address TEXT, iphone_model TEXT, company TEXT, card_pan TEXT);",
    });
    const { signals } = assess(root, undefined, "mvp");
    expect(signals.personalData.map((finding) => finding.name)).toEqual(["phone", "address"]);
    expect(signals.cardData.map((finding) => finding.name)).toEqual(["pan"]);
  });

  it("finds personal data in camelCase names too, as ORMs in most languages write them", () => {
    const root = project({
      "prisma/schema.prisma":
        "model Parcel {\n  recipientPhone String\n  dateOfBirth DateTime\n  homeAddress String\n  iPhoneModel String\n  cardNumber String\n}\n",
      "src/entities/customer.entity.ts": "@Column() emailAddress: string;\n@Column() IPAddress: string;\n",
      "database/migrations/2026_01_01_create_couriers.php": "$table->string('national_id');\n",
    });
    const { signals } = assess(root, undefined, "mvp");
    expect(signals.personalData.map((finding) => finding.name).sort()).toEqual([
      "address",
      "date_of_birth",
      "email",
      "home_address",
      "ip_address",
      "national_id",
      "phone",
    ]);
    expect(signals.cardData.map((finding) => finding.name)).toEqual(["card_number"]);
  });

  it("finds data models, payment providers and monitoring in any language's files", () => {
    const root = project({
      "app/Models/Customer.php": "protected $fillable = ['email'];\n",
      "Entities/Patient.cs": "public string PhoneNumber { get; set; }\n",
      "Payments/Payments.csproj": '<PackageReference Include="Stripe.net" Version="48.0.0" />',
      "Cargo.toml": '[dependencies]\ntracing-subscriber = "0.3"\n',
    });
    const { signals, items } = assess(root, undefined, "mvp");
    expect(signals.personalData.map((finding) => finding.name).sort()).toEqual(["email", "phone_number"]);
    expect(signals.paymentProviders).toEqual(["stripe"]);
    expect(items.observability).toMatchObject({ status: "present", note: "Found: tracing-subscriber." });
  });

  it("finds tests named the way each language names them", () => {
    for (const file of [
      "src/Shop.Tests/OrderTests.cs",
      "spec/order_spec.rb",
      "app/order_spec.rb",
      "tests/Unit/OrderTest.php",
      "src/OrderTest.php",
      "lib/order_test.exs",
      "shared/OrderSpec.kt",
      "Tests/NotesTests/NoteTests.swift",
      "src/orders.test.ts",
    ]) {
      expect(statusOf(project({ [file]: "" })).tests, file).toBe("present");
    }
  });

  it("never counts Peer AI's own skills as the project's documents", () => {
    const skill = "skills/peer-ai-code-review/references/architecture.md";
    const status = statusOf(project({ [`.claude/${skill}`]: "# Where code lives", [`.agents/${skill}`]: "" }));
    expect(status.architecture).not.toBe("present");
    expect(statusOf(project({ "docs/architecture.md": "# Architecture" })).architecture).toBe("present");
  });

  it("finds a design system written down", () => {
    const status = statusOf(project({ "web/package.json": "{}", "docs/design-system.md": "# Design system" }));
    expect(status.design).toBe("present");
  });

  it("finds a data model written down before any migration exists", () => {
    expect(statusOf(project({ "docs/data-model.md": "# Data model" }))["data-model"]).toBe("present");
  });

  it("finds a Rails data model in its migrations", () => {
    expect(statusOf(project({ "db/migrate/20260101000000_create_orders.rb": "" }))["data-model"]).toBe("present");
  });

  const traitProject = {
    "apps/web/package.json": json({
      dependencies: { react: "19.0.0", "socket.io-client": "4.8.0", "@anthropic-ai/sdk": "0.70.0" },
    }),
    "apps/web/public/sw.js": "",
    "apps/mobile/package.json": json({ dependencies: { expo: "57.0.0", "expo-image-picker": "17.0.0" } }),
    "services/api/requirements.txt": "fastapi\nstripe\n",
    "services/api/models/menu_item.py": "tenant_id = Column(String)\nallergens = Column(String)\n",
  };

  it("suggests traits from what the code uses, each with its evidence", () => {
    expect(assess(project(traitProject), undefined, "mvp").suggestedTraits).toEqual([
      { trait: "money", evidence: "payment provider stripe" },
      { trait: "safety-critical", evidence: "allergens in services/api/models/menu_item.py" },
      { trait: "several-audiences", evidence: "2 apps (mobile, web) share a backend" },
      { trait: "offline", evidence: "a service worker, apps/web/public/sw.js" },
      { trait: "real-time", evidence: "socket.io-client in apps/web/package.json" },
      { trait: "uploads", evidence: "expo-image-picker in apps/mobile/package.json" },
      { trait: "ai-features", evidence: "@anthropic-ai/sdk in apps/web/package.json" },
    ]);
    expect(
      assess(project({ "package.json": json({ dependencies: { react: "19.0.0" } }) }), undefined, "mvp"),
    ).toMatchObject({
      suggestedTraits: [],
    });
  });

  it("suggests stack profiles for each part's stack, from the config or from detection", () => {
    const parts = {
      "apps/web/package.json": json({ dependencies: { react: "19.0.0" }, devDependencies: { typescript: "6.0.3" } }),
      "services/api/requirements.txt": "fastapi\n",
    };
    expect(assess(project(parts), undefined, "mvp").suggestedProfiles).toEqual([
      { profile: "typescript", evidence: "web is tagged typescript" },
    ]);
    const listed = project({
      ...parts,
      "peer-ai.config.json": json({
        version: 1,
        project: { name: "Repairs", stage: "mvp" },
        tracks: [
          { id: "web", kind: "web", path: "apps/web", status: "active" },
          { id: "api", kind: "backend", path: "services/api", status: "active" },
        ],
        standards: { profiles: ["typescript"] },
      }),
    });
    expect(assess(listed, loadConfig(listed).config, "mvp")).toMatchObject({
      suggestedProfiles: [],
      suggestedStacks: [
        { track: "web", stack: ["typescript", "react"] },
        { track: "api", stack: ["python", "fastapi"] },
      ],
    });
    const out = capture();
    runAssess({ cwd: project(parts), json: false, dryRun: true, now: NOW }, out, formatReport);
    expect(out.text()).toContain(
      "Stack profiles to consider, each with the tools that enforce its rules. Add the ones that fit to standards.profiles in peer-ai.config.json:\n  typescript: web is tagged typescript",
    );
  });

  it("leaves out traits the config declares, and prints the rest in the report", () => {
    const root = project({
      ...traitProject,
      "peer-ai.config.json": json({
        version: 1,
        project: { name: "Menu", stage: "mvp", traits: ["money", "safety-critical", "ai-features"] },
        tracks: [
          { id: "web", kind: "web", path: "apps/web", status: "active" },
          { id: "mobile", kind: "mobile", path: "apps/mobile", status: "active" },
          { id: "api", kind: "backend", path: "services/api", status: "active" },
        ],
      }),
    });
    expect(assess(root, loadConfig(root).config, "mvp").suggestedTraits.map((suggestion) => suggestion.trait)).toEqual([
      "several-audiences",
      "offline",
      "real-time",
      "uploads",
    ]);
    const out = capture();
    runAssess({ cwd: root, json: false, dryRun: true, now: NOW }, out, formatReport);
    expect(out.text()).toContain(
      "Traits to consider, each switching on extra rules. Add the ones that fit to project.traits in peer-ai.config.json:\n  several-audiences: 2 apps (web, mobile) share a backend\n",
    );
  });

  it("infers the architecture from the code when there is no document, and says so", () => {
    const root = project({
      "apps/web/package.json": json({ dependencies: { react: "19.0.0" } }),
      "services/api/requirements.txt": "fastapi\n",
      "services/api/tests/test_health.py": "",
    });
    const { items } = assess(root, undefined, "mvp");
    expect(items.architecture).toMatchObject({
      status: "partial",
      inferred: true,
      evidence: ["apps/web", "services/api"],
    });
    expect(items.tests).toMatchObject({ status: "partial", note: "Tests in 1 of 2 parts; none in: web." });
    expect(items["api-contract"]).toMatchObject({ status: "missing" });
  });

  it("counts a written test strategy as a start on the tests, never as tests", () => {
    const planned = assess(
      project({ "apps/web/package.json": json({}), "docs/test-strategy.md": "# Test strategy\n" }),
      undefined,
      "mvp",
    );
    expect(planned.items.tests).toMatchObject({
      status: "partial",
      evidence: ["docs/test-strategy.md"],
      note: "A test strategy, but no tests yet.",
    });
    const tested = assess(
      project({ "docs/test-strategy.md": "# Test strategy\n", "src/cart.test.ts": "" }),
      undefined,
      "mvp",
    );
    expect(tested.items.tests).toMatchObject({ status: "present", evidence: ["src/cart.test.ts"] });
  });

  it("uses the config's parts, APIs, environments and design when there is one", () => {
    const root = project({
      "peer-ai.config.json": json({
        version: 1,
        project: { name: "Portal", stage: "production" },
        design: { status: "exists", reference: "https://design.example/portal" },
        tracks: [
          { id: "portal", kind: "web", status: "active", deploy: { target: "vercel" } },
          { id: "backend", kind: "backend", repo: "acme/api", status: "external" },
        ],
        apis: [
          {
            id: "api",
            kind: "http",
            providedBy: "backend",
            contract: { source: "openapi", location: "api/openapi.json" },
          },
        ],
        environments: [{ id: "production", production: true }],
      }),
      "api/openapi.json": "{}",
    });
    const out = capture();
    expect(runAssess({ cwd: root, json: false, dryRun: true, now: NOW }, out, formatReport)).toBe(0);
    expect(out.text()).toContain("Peer AI assessment: Portal (stage: production)");
    const { items } = assess(root, undefined, "production");
    expect(items["api-contract"].status).toBe("present");
    const configured = JSON.parse(readFileSync(join(root, "peer-ai.config.json"), "utf8")) as unknown;
    expect(configured).toBeDefined();
  });

  it("follows a relative extends, and reports an invalid config instead of guessing", () => {
    const root = project({
      "base.json": json({ tracks: [{ id: "app", kind: "web", status: "active" }] }),
      "peer-ai.config.json": json({ extends: "./base.json", version: 1, project: { name: "Studio app" } }),
    });
    const out = capture();
    expect(runAssess({ cwd: root, json: false, dryRun: true, now: NOW }, out, formatReport)).toBe(0);
    expect(out.text()).toContain("1 part: app (web)");

    const broken = project({ "peer-ai.config.json": json({ version: 1, project: {}, tracks: [] }) });
    const errors = capture();
    expect(runAssess({ cwd: broken, json: false, dryRun: true, now: NOW }, errors, formatReport)).toBe(2);
    expect(errors.text()).toContain("peer-ai.config.json is not valid");
  });

  it("respects .gitignore and never counts dependency folders", () => {
    const root = project(
      {
        ".gitignore": "private/\n",
        "private/threat-model.md": "",
        "node_modules/some-lib/docs/requirements.md": "",
      },
      { git: true },
    );
    expect(statusOf(root)).toMatchObject({ "threat-model": "missing", requirements: "missing" });
  });
});

describe("runAssess", () => {
  const options = (cwd: string, extra: Partial<AssessOptions> = {}): AssessOptions => ({
    cwd,
    json: false,
    dryRun: false,
    now: NOW,
    ...extra,
  });

  it("writes a valid project map", () => {
    const root = complete();
    expect(runAssess(options(root), capture(), formatReport)).toBe(0);
    const map = JSON.parse(readFileSync(join(root, ".peer-ai/map.json"), "utf8")) as unknown;
    expect(validateMap(map).ok).toBe(true);
    expect(map).toMatchObject({ version: 1, assessedAt: "2026-10-02T09:15:00.000Z" });
  });

  it("writes nothing on a dry run, and prints only the map with --json", () => {
    const root = project();
    const out = capture();
    runAssess(options(root, { dryRun: true, json: true }), out, formatReport);
    expect(existsSync(join(root, ".peer-ai/map.json"))).toBe(false);
    expect(validateMap(JSON.parse(out.text())).ok).toBe(true);
  });

  it("assesses against a target stage", () => {
    const root = project({ "README.md": "# App", "docs/guide.md": "" });
    const prototype = capture();
    runAssess(options(root, { dryRun: true, target: "prototype" }), prototype, formatReport);
    expect(prototype.text()).toContain("Nothing is required at the prototype stage.");
    expect(prototype.text()).toContain("Later, for mvp: requirements, ci, tests, threat-model.");
    const production = capture();
    runAssess(options(root, { dryRun: true, target: "production" }), production, formatReport);
    expect(production.text()).toContain("Needed for production");
  });

  it("reports compliance signals as things to check, not as findings", () => {
    const out = capture();
    runAssess(options(complete(), { dryRun: true }), out, formatReport);
    expect(out.text()).toContain("Personal data in 2 fields: email, phone_number");
    expect(out.text()).toContain("Card-related names in the schema: card_number");
    expect(out.text()).toContain("Check that only the last four digits and a payment provider's token are stored");
    expect(out.text()).toContain("Rule packs to consider: pci-dss");
  });

  it("leaves out a copy of the v0 playbook, and says so", () => {
    const root = project({
      "peer-ai/shared/00-setup.md": "",
      "peer-ai/phase-config.json": "{}",
      "peer-ai/templates/threat-model-template.md": "",
    });
    const out = capture();
    runAssess(options(root, { dryRun: true }), out, formatReport);
    expect(out.text()).toContain("Left out: the peer-ai/ folder");
    expect(assess(root, undefined, "mvp").items["threat-model"].status).toBe("missing");
  });
});

describe("assess on real-world layouts", () => {
  it("counts a CI pipeline in the repository even when the config says there is none", () => {
    const root = project({
      "peer-ai.config.json": json({
        version: 1,
        project: { name: "Shop" },
        tracks: [{ id: "web", kind: "web", status: "active" }],
        delivery: { ci: "none" },
      }),
      ".github/workflows/checks.yml": "on: push\n",
    });
    expect(assess(root, loadConfig(root).config, "mvp").items.ci).toEqual({
      status: "present",
      evidence: [".github/workflows/"],
    });
  });

  it("keeps a peer-ai/ folder that is not the v0 playbook", () => {
    const root = project({ "peer-ai/threat-model.md": "" });
    const result = assess(root, undefined, "mvp");
    expect(result.legacyPlaybook).toBe(false);
    expect(result.items["threat-model"].status).toBe("present");
  });

  it("takes a brief only when the name says brief, not when it merely starts the same way", () => {
    expect(statusOf(project({ "PRODUCTION_DEPLOYMENT.md": "" })).requirements).toBe("missing");
    expect(statusOf(project({ "PRODUCTS.md": "" })).requirements).toBe("missing");
    expect(statusOf(project({ "PRODUCT_BRIEF.md": "" })).requirements).toBe("present");
    expect(statusOf(project({ "PRD.md": "" })).requirements).toBe("present");
    expect(statusOf(project({ "docs/PRODUCT.md": "" })).requirements).toBe("present");
  });

  it("finds a spec at the repository root, but not a word that merely contains spec", () => {
    expect(statusOf(project({ "Shop Complete Spec.md": "" })).specs).toBe("present");
    expect(statusOf(project({ "specification.md": "" })).specs).toBe("present");
    expect(statusOf(project({ "inspect.md": "" })).specs).toBe("missing");
  });

  it("counts infrastructure as code wherever it lives", () => {
    const root = project({
      "peer-ai.config.json": json({
        version: 1,
        project: { name: "Shop" },
        tracks: [{ id: "web", kind: "web", status: "active" }],
      }),
      "platform/terraform/envs/production/main.tf": "",
      "platform/terraform/envs/production/variables.tf": "",
    });
    const { config } = loadConfig(root);
    expect(config).toBeDefined();
    expect(assess(root, config, "production").items.infrastructure).toEqual({
      status: "present",
      evidence: ["platform/terraform/envs/production"],
    });
  });
});
