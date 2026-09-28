// peer-ai assess: reads a repository and records, for each item on the project map, whether
// it is present, partial, missing or not applicable, with the files that prove it. Items found
// by reading code rather than a document are marked inferred, for a person to confirm.
// Gaps are ranked by the project's stage: a prototype needs almost nothing, production a lot.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  MAP_ITEM_IDS,
  resolveConfig,
  validateConfig,
  validateMap,
  type KnownMapItemId,
  type PeerAiConfig,
  type ProjectMap,
} from "@peer-ai/workflow";
import { CONFIG_FILE, detect, detectDelivery } from "./detect.ts";
import { listRepoFiles } from "./files.ts";
import type { Output, Stage } from "./init.ts";

export const MAP_FILE = ".peer-ai/map.json";
export const MAP_SCHEMA_URL =
  "https://raw.githubusercontent.com/AbuMahir980/peer-ai/next/packages/workflow/schemas/map.schema.json";

export type Status = "present" | "partial" | "missing" | "not-applicable";

export interface ItemResult {
  status: Status;
  evidence?: string[];
  note?: string;
  inferred?: boolean;
}

export interface Track {
  id: string;
  kind: string;
  path?: string;
  deploy?: string;
  status: string;
}

export interface Finding {
  name: string;
  file: string;
}

export interface Signals {
  personalData: Finding[];
  cardData: Finding[];
  paymentProviders: string[];
}

export interface Assessment {
  name: string;
  stage: Stage;
  tracks: Track[];
  items: Record<KnownMapItemId, ItemResult>;
  signals: Signals;
  /** A copy of the v0 playbook was found and left out of the assessment. */
  legacyPlaybook: boolean;
}

/** What each stage needs. Items not applicable to a project are never required. */
export const REQUIRED: Record<Stage, KnownMapItemId[]> = {
  prototype: [],
  mvp: ["requirements", "api-contract", "ci", "tests", "threat-model", "data-inventory", "docs"],
  production: [
    "requirements",
    "api-contract",
    "ci",
    "tests",
    "threat-model",
    "data-inventory",
    "docs",
    "architecture",
    "specs",
    "data-model",
    "dpia",
    "design",
    "standards",
    "environments",
    "infrastructure",
    "observability",
    "slos",
    "runbooks",
    "load-testing",
  ],
};

export const NEXT_STAGE: Record<Stage, Stage | undefined> = {
  prototype: "mvp",
  mvp: "production",
  production: undefined,
};

const UI_KINDS = ["web", "mobile", "desktop", "extension"];
const MANIFEST =
  /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|pubspec\.yaml|Gemfile|go\.mod|composer\.json|build\.gradle(\.kts)?|pom\.xml)$/;
const SCHEMA_FILE =
  /(^|\/)(migrations?|alembic|prisma|drizzle|supabase|db|database)\/.*\.(sql|py|ts|js|rb|prisma)$|\.sql$|schema\.prisma$|(^|\/)models?\.py$|(^|\/)models\/[^/]+\.py$|\.entity\.ts$/i;
// Field names are matched as whole words, where an underscore also separates words, so a prefixed
// name such as recipient_phone counts but iphone doesn't.
const PERSONAL_FIELD =
  /(?<![a-z0-9])(email|phone(?:_number)?|mobile_number|date_of_birth|dob|birth_?date|home_address|address(?:_line_?\d)?|post_?code|zip_?code|bvn|nin|ssn|national_id|passport(?:_number)?|ip_address|latitude|longitude)(?![a-z0-9])/gi;
const CARD_FIELD = /(?<![a-z0-9])(card_?number|card_no|pan|cvv2?|cvc|card_expiry)(?![a-z0-9])/gi;
const PAYMENT_PROVIDER =
  /\b(stripe|paystack|flutterwave|braintree|adyen|razorpay|paypal|squareup|mollie|monnify|interswitch)\b/gi;
const OBSERVABILITY =
  /(@sentry\/[\w-]+|\bsentry[\w-]*|@opentelemetry\/[\w-]+|\bopentelemetry[\w-]*|\bdd-trace\b|\bdatadog\b|\bnewrelic\b|\bprom-client\b|\bprometheus[\w-]*|\bstructlog\b|\bpino\b|\bwinston\b|\bloguru\b|\blogfire\b)/gi;
const LOCAL_SCHEMA_FILE = /(^|\/)(db|database|schema|storage|store|models?)\.(ts|tsx|js|mjs)$/i;
const LOCAL_SCHEMA = /\.stores\(\s*\{|indexedDB\.open\(|\bopenDB\(|\bappSchema\(|CREATE TABLE/;
const INFRASTRUCTURE_AS_CODE =
  /\.tf$|\.tf\.json$|\.bicep$|\.cfn\.(ya?ml|json)$|(^|\/)(Pulumi\.ya?ml|cdk\.json|Chart\.yaml|kustomization\.ya?ml|serverless\.ya?ml|samconfig\.toml)$/;
// A copy of the v0 playbook, which 1.0 replaces, recognised by its setup files. Its templates
// would otherwise read as the project's own requirements, specs and standards.
export const LEGACY_PLAYBOOK = "peer-ai/";
export const LEGACY_MARKERS = ["peer-ai/shared/00-setup.md", "peer-ai/phase-config.json"];
const TEST_FILE =
  /(^|\/)(tests?|__tests__|integration_test|spec|e2e)\/|[._-](test|spec)\.[cm]?[jt]sx?$|_test\.(go|dart|py)$|(^|\/)test_[^/]+\.py$|Tests?\.(swift|kt|java)$/;

interface Context {
  root: string;
  files: string[];
  tracks: Track[];
  config: PeerAiConfig | undefined;
  read: (file: string) => string;
}

const clip = (text: string, max = 200): string => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);
const unique = <T>(values: T[]): T[] => [...new Set(values)];

function matching(ctx: Context, pattern: RegExp): string[] {
  return ctx.files.filter((file) => pattern.test(file));
}

/** Up to five pieces of evidence, preferring the folder when many files share one. */
function evidence(files: string[], collapseTo?: RegExp): string[] {
  const shown = collapseTo === undefined ? files : files.map((file) => collapseTo.exec(file)?.[0] ?? file);
  return unique(shown).sort().slice(0, 5);
}

function scan(ctx: Context, files: string[], pattern: RegExp): Finding[] {
  const found = new Map<string, string>();
  for (const file of files) {
    for (const match of ctx.read(file).matchAll(pattern)) {
      const name = match[1]?.toLowerCase() ?? match[0].toLowerCase();
      if (!found.has(name)) found.set(name, file);
    }
  }
  return [...found].map(([name, file]) => ({ name, file }));
}

export function collectSignals(ctx: Context): Signals {
  const schemaFiles = matching(ctx, SCHEMA_FILE);
  const manifests = matching(ctx, MANIFEST);
  return {
    personalData: scan(ctx, schemaFiles, PERSONAL_FIELD),
    cardData: scan(ctx, schemaFiles, CARD_FIELD),
    paymentProviders: scan(ctx, manifests, PAYMENT_PROVIDER).map((finding) => finding.name),
  };
}

function trackEvidence(tracks: Track[]): string[] {
  return tracks.map((track) => track.path ?? ".");
}

type Rule = (ctx: Context, signals: Signals) => ItemResult;

const present = (files: string[]): ItemResult => ({ status: "present", evidence: files });

const RULES: Record<KnownMapItemId, Rule> = {
  requirements: (ctx) => {
    const docs = matching(
      ctx,
      /(^|\/)(PRODUCT|PRD|REQUIREMENTS|BRIEF)([^a-z/][^/]*)?\.md$|(^|\/)docs\/[^/]*(requirement|product-brief|prd|brief)[^/]*\.md$/i,
    );
    return docs.length > 0 ? present(evidence(docs)) : { status: "missing" };
  },

  architecture: (ctx) => {
    const docs = matching(
      ctx,
      /(^|\/)ARCHITECTURE\.md$|(^|\/)docs\/[^/]*architecture[^/]*\.md$|(^|\/)(adr|adrs|decisions)\/[^/]+\.md$/i,
    );
    if (docs.length > 0) return present(evidence(docs, /^(.*\/)?(adr|adrs|decisions)\//i));
    if (ctx.tracks.length === 0) return { status: "missing" };
    const parts = ctx.tracks.map((track) => `${track.id} (${track.kind})`).join(", ");
    return {
      status: "partial",
      evidence: trackEvidence(ctx.tracks),
      inferred: true,
      note: clip(`No architecture document. From the code: ${String(ctx.tracks.length)} parts: ${parts}.`),
    };
  },

  "threat-model": (ctx) => {
    const docs = matching(ctx, /threat[-_ ]?model/i);
    return docs.length > 0 ? present(evidence(docs)) : { status: "missing" };
  },

  specs: (ctx) => {
    const docs = matching(
      ctx,
      /(^|\/)docs\/.*spec[^/]*\.md$|(^|\/)specs?\/[^/]+\.md$|^[^/]*\b(spec|specs|specification)\b[^/]*\.md$/i,
    );
    return docs.length > 0 ? present(evidence(docs)) : { status: "missing" };
  },

  "api-contract": (ctx) => {
    const configured = (ctx.config?.apis ?? [])
      .map((api) => api.contract?.location)
      .filter((location): location is string => location !== undefined && existsSync(join(ctx.root, location)));
    const files = matching(
      ctx,
      /(^|\/)(openapi|swagger|asyncapi)[^/]*\.(json|ya?ml)$|\.proto$|\.graphqls?$|(^|\/)docs\/[^/]*api-contract[^/]*\.md$/i,
    );
    const found = unique([...configured, ...files]);
    if (found.length > 0) return present(evidence(found));
    const own = ctx.tracks.map((track) => track.id);
    const apis = ctx.config?.apis ?? [];
    const providesApi =
      ctx.tracks.some((track) => track.kind === "backend") ||
      apis.some((api) => api.providedBy !== undefined && own.includes(api.providedBy));
    if (!providesApi) {
      const statusOf = new Map((ctx.config?.tracks ?? []).map((track) => [track.id, track.status]));
      const providedWhile = (status: string) =>
        apis
          .filter((api) => api.providedBy !== undefined && statusOf.get(api.providedBy) === status)
          .map((api) => api.id);
      const elsewhere = providedWhile("external");
      const later = providedWhile("dormant");
      const note =
        elsewhere.length > 0
          ? `Provided by another repository, where its contract lives: ${elsewhere.join(", ")}.`
          : later.length > 0
            ? `Provided by a part that hasn't started yet: ${later.join(", ")}.`
            : "No API is provided by this repository.";
      return { status: "not-applicable", note: clip(note), inferred: true };
    }
    return {
      status: "missing",
      note: "No contract file found. Frameworks such as FastAPI generate one at runtime: commit it, or set its location in peer-ai.config.json.",
    };
  },

  "data-model": (ctx) => {
    const files = matching(
      ctx,
      /(^|\/)(migrations?|alembic|drizzle)\/|schema\.prisma$|(^|\/)db\/schema\.(rb|sql)$|(^|\/)supabase\/migrations\//i,
    );
    if (files.length > 0) {
      return present(
        evidence(files, /^(.*\/)?(migrations?|alembic|drizzle|supabase\/migrations)\/|^.*schema\.(prisma|rb|sql)$/i),
      );
    }
    // An offline-first or mobile app keeps its database on the device, defined in code rather than
    // in migration files: Dexie or idb for IndexedDB, WatermelonDB, or SQLite tables.
    const onDevice = matching(ctx, LOCAL_SCHEMA_FILE).filter((file) => LOCAL_SCHEMA.test(ctx.read(file)));
    if (onDevice.length > 0) {
      return { ...present(evidence(onDevice)), note: "A database on the device, defined in code." };
    }
    if (ctx.tracks.some((track) => track.kind === "backend")) return { status: "missing" };
    return { status: "not-applicable", note: "No database found in this repository.", inferred: true };
  },

  "data-inventory": (ctx, signals) => {
    const configured = ctx.config?.compliance?.dataInventory;
    const docs = matching(ctx, /data[-_ ]?inventory/i);
    if (configured !== undefined && existsSync(join(ctx.root, configured))) return present([configured]);
    if (docs.length > 0) return present(evidence(docs));
    if (signals.personalData.length === 0) {
      return {
        status: "not-applicable",
        note: "No personal-data fields found in the schema or migrations.",
        inferred: true,
      };
    }
    const names = signals.personalData.map((finding) => finding.name).join(", ");
    return {
      status: "missing",
      note: clip(`Personal data in ${String(signals.personalData.length)} fields (${names}), and no inventory of it.`),
    };
  },

  dpia: (ctx, signals) => {
    const docs = matching(ctx, /dpia|data[-_ ]protection[-_ ]impact|impact[-_ ]assessment/i);
    if (docs.length > 0) return present(evidence(docs));
    if (signals.personalData.length === 0) {
      return {
        status: "not-applicable",
        note: "No personal-data fields found in the schema or migrations.",
        inferred: true,
      };
    }
    return { status: "missing" };
  },

  design: (ctx) => {
    const reference = ctx.config?.design?.reference;
    if (reference !== undefined && (/^https?:\/\//.test(reference) || existsSync(join(ctx.root, reference)))) {
      return present([reference]);
    }
    const files = matching(
      ctx,
      /(^|\/)(design|designs|design_handoff[^/]*|mockups?|figma)\/|(^|\/)(design-)?tokens\.(json|ts|js|css)$/i,
    );
    if (files.length > 0)
      return present(evidence(files, /^(.*\/)?(design|designs|design_handoff[^/]*|mockups?|figma)\//i));
    if (ctx.tracks.some((track) => UI_KINDS.includes(track.kind))) return { status: "missing" };
    return { status: "not-applicable", note: "No user interface found.", inferred: true };
  },

  standards: (ctx) => {
    const documents = (ctx.config?.standards?.documents ?? []).map((document) => document.path);
    const written = matching(
      ctx,
      /(^|\/)docs\/.*(standard|coding-rules|conventions|style-guide).*\.md$|(^|\/)(STANDARDS|CONVENTIONS|STYLEGUIDE)[^/]*\.md$/i,
    );
    if (documents.length + written.length > 0) return present(evidence([...documents, ...written]));
    const linting = matching(
      ctx,
      /(^|\/)(eslint\.config\.[cm]?[jt]s|\.eslintrc[^/]*|biome\.jsonc?|ruff\.toml|\.golangci\.ya?ml|analysis_options\.yaml|\.rubocop\.yml|detekt\.yml)$/,
    );
    if (linting.length > 0) {
      return {
        status: "partial",
        evidence: evidence(linting),
        note: "Linting is configured, but there is no written standard.",
      };
    }
    return { status: "missing" };
  },

  ci: (ctx) => {
    // A pipeline in the repository counts whatever the config says: the config may predate it.
    const found = detectDelivery(ctx.root);
    if (found !== undefined) return present([found.pipeline]);
    const configured = ctx.config?.delivery;
    if (configured?.ci === "existing") return present([configured.pipeline ?? CONFIG_FILE]);
    return { status: "missing" };
  },

  environments: (ctx) => {
    if ((ctx.config?.environments ?? []).length > 0) return present([CONFIG_FILE]);
    const files = matching(
      ctx,
      /(^|\/)\.env\.(staging|production|prod)(\.example)?$|(^|\/)(environments|envs)\/|[._-](staging|production|prod)\.(ya?ml|json|toml|tfvars)$/i,
    );
    if (files.length > 0) return present(evidence(files));
    const deployed = ctx.tracks.filter((track) => track.deploy !== undefined);
    if (deployed.length > 0) {
      return {
        status: "partial",
        evidence: trackEvidence(deployed),
        note: "Parts deploy, but no environments are defined.",
      };
    }
    return { status: "missing" };
  },

  tests: (ctx) => {
    const testFiles = matching(ctx, TEST_FILE);
    const parts = ctx.tracks.filter(
      (track) => track.kind !== "infrastructure" && ["active", "frozen"].includes(track.status),
    );
    if (parts.length === 0) return testFiles.length > 0 ? present(evidence(testFiles)) : { status: "missing" };
    const inside = (track: Track) =>
      testFiles.filter((file) => track.path === undefined || file.startsWith(`${track.path}/`));
    const tested = parts.filter((track) => inside(track).length > 0);
    if (tested.length === 0) return { status: "missing" };
    if (tested.length === parts.length) return present(trackEvidence(tested));
    const untested = parts.filter((track) => !tested.includes(track)).map((track) => track.id);
    return {
      status: "partial",
      evidence: trackEvidence(tested),
      note: clip(
        `Tests in ${String(tested.length)} of ${String(parts.length)} parts; none in: ${untested.join(", ")}.`,
      ),
    };
  },

  "load-testing": (ctx) => {
    const files = matching(
      ctx,
      /(^|\/)(k6|load[-_]?tests?|perf)\/|\.k6\.[jt]s$|(^|\/)locustfile\.py$|artillery[^/]*\.ya?ml$|\.jmx$|k6-summary/i,
    );
    return files.length > 0 ? present(evidence(files)) : { status: "missing" };
  },

  infrastructure: (ctx) => {
    const infra = ctx.tracks.filter((track) => track.kind === "infrastructure");
    if (infra.length > 0) return present(trackEvidence(infra));
    const iac = matching(ctx, INFRASTRUCTURE_AS_CODE);
    if (iac.length > 0) return present(evidence(iac.map((file) => dirname(file))));
    const deployed = ctx.tracks.filter((track) => track.deploy !== undefined);
    if (deployed.length > 0) {
      const targets = unique(deployed.map((track) => track.deploy)).join(", ");
      return {
        status: "partial",
        evidence: trackEvidence(deployed),
        note: clip(`Deployed through platform configuration (${targets}), with no infrastructure as code.`),
      };
    }
    return { status: "missing" };
  },

  observability: (ctx) => {
    const manifests = matching(ctx, MANIFEST);
    const found = scan(ctx, manifests, OBSERVABILITY);
    if (found.length === 0) return { status: "missing" };
    return {
      status: "present",
      evidence: evidence(found.map((finding) => finding.file)),
      note: clip(`Found: ${unique(found.map((finding) => finding.name)).join(", ")}.`),
    };
  },

  slos: (ctx) => {
    const files = matching(ctx, /(^|\/)[^/]*\bslos?\b[^/]*\.(md|ya?ml|json)$|service[-_ ]level/i);
    return files.length > 0 ? present(evidence(files)) : { status: "missing" };
  },

  runbooks: (ctx) => {
    const files = matching(ctx, /runbook/i);
    return files.length > 0 ? present(evidence(files, /^(.*\/)?runbooks?\//i)) : { status: "missing" };
  },

  docs: (ctx) => {
    const readme = matching(ctx, /^README(\.md)?$/i);
    const docs = matching(ctx, /^docs\/.*\.md$/i);
    if (readme.length > 0 && docs.length > 0) return present([...readme, "docs/"]);
    if (readme.length > 0) return { status: "partial", evidence: readme, note: "A README, but no docs folder." };
    return { status: "missing" };
  },
};

function tracksFromConfig(config: PeerAiConfig): Track[] {
  return config.tracks.map((track) => ({
    id: track.id,
    kind: track.kind,
    ...(track.path === undefined ? {} : { path: track.path }),
    ...(track.deploy === undefined ? {} : { deploy: track.deploy.target }),
    status: track.status,
  }));
}

export function assess(root: string, config: PeerAiConfig | undefined, stage: Stage): Assessment {
  const cache = new Map<string, string>();
  const read = (file: string): string => {
    const cached = cache.get(file);
    if (cached !== undefined) return cached;
    const full = join(root, file);
    const text = existsSync(full) && statSync(full).size <= 1_000_000 ? readFileSync(full, "utf8") : "";
    cache.set(file, text);
    return text;
  };
  const detected = config === undefined ? detect(root) : undefined;
  const tracks =
    config === undefined
      ? (detected?.tracks ?? []).map((track) => ({
          id: track.id,
          kind: track.kind,
          ...(track.path === undefined ? {} : { path: track.path }),
          ...(track.deploy === undefined ? {} : { deploy: track.deploy }),
          status: "active",
        }))
      : tracksFromConfig(config);

  const allFiles = listRepoFiles(root);
  const legacyPlaybook = allFiles.some((file) => LEGACY_MARKERS.includes(file));
  const files = legacyPlaybook ? allFiles.filter((file) => !file.startsWith(LEGACY_PLAYBOOK)) : allFiles;
  // Parts in another repository, and parts not started yet, are listed but create no requirements.
  const own = tracks.filter((track) => track.status !== "external" && track.status !== "dormant");
  const ctx: Context = { root, files, tracks: own, config, read };
  const signals = collectSignals(ctx);
  const items = Object.fromEntries(MAP_ITEM_IDS.map((id) => [id, RULES[id](ctx, signals)])) as Record<
    KnownMapItemId,
    ItemResult
  >;
  return {
    name: config?.project.name ?? detected?.name ?? "",
    stage,
    tracks,
    items,
    signals,
    legacyPlaybook,
  };
}

export function gaps(assessment: Assessment, stage: Stage): KnownMapItemId[] {
  return REQUIRED[stage].filter((id) => ["missing", "partial"].includes(assessment.items[id].status));
}

export function toMap(assessment: Assessment, now: Date): ProjectMap {
  const at = now.toISOString();
  const map = {
    $schema: MAP_SCHEMA_URL,
    version: 1,
    assessedAt: at,
    items: Object.fromEntries(
      MAP_ITEM_IDS.map((id) => {
        const item = assessment.items[id];
        return [
          id,
          {
            status: item.status,
            ...(item.evidence === undefined ? {} : { evidence: item.evidence }),
            ...(item.inferred === true ? { inferred: true } : {}),
            ...(item.note === undefined ? {} : { note: item.note }),
            checkedAt: at,
          },
        ];
      }),
    ),
  };
  const result = validateMap(map);
  if (!result.ok) throw new Error(`assess built an invalid project map: ${result.errors.join("; ")}`);
  return result.value;
}

/** Reads peer-ai.config.json, following a relative `extends`. Returns errors instead of throwing. */
export function loadConfig(root: string): { config?: PeerAiConfig; errors?: string[] } {
  const path = join(root, CONFIG_FILE);
  if (!existsSync(path)) return {};
  const readLayer = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
  try {
    const own = readLayer(path) as { extends?: unknown };
    const layers: unknown[] = [];
    if (typeof own.extends === "string") {
      if (!own.extends.startsWith(".")) {
        return { errors: [`extends: only a relative path is supported so far, not "${own.extends}"`] };
      }
      layers.push(readLayer(join(dirname(path), own.extends)));
    }
    layers.push(own);
    const result = validateConfig(resolveConfig(layers));
    return result.ok ? { config: result.value } : { errors: result.errors };
  } catch (error) {
    return { errors: [(error as Error).message] };
  }
}

export interface AssessOptions {
  cwd: string;
  target?: Stage;
  json: boolean;
  dryRun: boolean;
  now?: Date;
}

export function runAssess(
  options: AssessOptions,
  out: Output,
  report: (assessment: Assessment, stage: Stage) => string[],
): number {
  const { config, errors } = loadConfig(options.cwd);
  if (errors !== undefined) {
    out.error(`${CONFIG_FILE} is not valid:`);
    for (const error of errors) out.error(`  ${error}`);
    return 2;
  }
  const stage = options.target ?? config?.project.stage ?? "mvp";
  const assessment = assess(options.cwd, config, stage);
  const map = toMap(assessment, options.now ?? new Date());

  if (options.json) out.log(JSON.stringify(map, null, 2));
  else for (const line of report(assessment, stage)) out.log(line);

  if (!options.dryRun) {
    const path = join(options.cwd, MAP_FILE);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(map, null, 2)}\n`);
    if (!options.json) out.log(`Wrote ${MAP_FILE}.`);
  }
  return 0;
}
