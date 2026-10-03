// Which skill comes next, so nobody has to remember 29 names (RFC 0004, section 8): the skill that
// fills each gap on the map, and the reviews a change needs, worked out from the files it touched.
// Only skills that exist are named or required; the rest follow as they're written.

import { execFileSync } from "node:child_process";
import { availableSkills, renderedName } from "peer-ai-skills";
import {
  MAP_ITEM_SKILLS,
  describeResult,
  type KnownMapItemId,
  type PeerAiConfig,
  type SkillId,
  type WorkItem,
} from "peer-ai-workflow";
import {
  INFRASTRUCTURE_AS_CODE,
  MANIFEST,
  PERSONAL_FIELD,
  SCHEMA_FILE,
  TEST_FILE,
  TRAIT_LIBRARIES,
  UI_KINDS,
  snakeCase,
} from "./assess.ts";
import type { Stage } from "./init.ts";

export interface RequiredReview {
  skill: SkillId;
  reason: string;
}

/** The installed name of each gap's skill, for the gaps whose skill exists. */
export function gapSkills(
  gaps: KnownMapItemId[],
  available: readonly SkillId[] = availableSkills(),
): Partial<Record<KnownMapItemId, string>> {
  const named: Partial<Record<KnownMapItemId, string>> = {};
  for (const gap of gaps) {
    const skill = (MAP_ITEM_SKILLS[gap] ?? []).find((candidate) => available.includes(candidate));
    if (skill !== undefined) named[gap] = renderedName(skill);
  }
  return named;
}

export const CODE =
  /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|php|cs|java|kt|kts|swift|dart|rs|ex|exs|vue|svelte|astro|scala|sql|c|cc|cpp|h|m|mm)$/;
export const SCREEN = /\.(tsx|jsx|vue|svelte|astro|html|css|scss|dart|swift)$|(^|\/)res\/layout\//;
export const MIGRATION = /(^|\/)(migrations?|migrate|alembic|drizzle)\/|schema\.prisma$|(^|\/)db\/schema\.(rb|sql)$/i;
export const LOCKFILE =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|poetry\.lock|uv\.lock|Pipfile\.lock|Cargo\.lock|go\.sum|Gemfile\.lock|composer\.lock|Podfile\.lock|pubspec\.lock|packages\.lock\.json|gradle\.lockfile)$/;
export const DEPLOYMENT =
  /(^|\/)(Dockerfile|[^/]*\.Dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml|vercel\.json|netlify\.toml|fly\.toml|render\.yaml|app\.yaml|wrangler\.(toml|jsonc?)|serverless\.ya?ml|Procfile)$|(^|\/)\.github\/workflows\/|\.gitlab-ci\.yml$/;
const DATA_INVENTORY = /data[-_ ]?inventory/i;
const API_KINDS = ["http", "graphql", "rpc", "websocket", "events"];

const aiLibraries = TRAIT_LIBRARIES.find(([trait]) => trait === "ai-features")?.[1];
/** A pattern's test without the state a global pattern keeps between calls. */
const matches = (pattern: RegExp, text: string) =>
  new RegExp(pattern.source, pattern.flags.replace("g", "")).test(text);

const inTrack = (file: string, track: { path?: string | undefined }) =>
  track.path === undefined || file.startsWith(`${track.path}/`);

/**
 * The reviews a change needs, from the files it touched. `read` gives a file's text, for the
 * checks that look inside: personal fields in a schema, an AI library in code.
 */
export function reviewsFor(
  files: string[],
  config: PeerAiConfig,
  stage: Stage,
  read: (file: string) => string,
  available: readonly SkillId[] = availableSkills(),
  item: { acceptance?: string[] | undefined } = {},
): RequiredReview[] {
  const tracks = config.tracks.filter((track) => track.status !== "external" && track.status !== "dormant");
  const code = files.filter((file) => CODE.test(file));
  const source = code.filter((file) => !TEST_FILE.test(file));
  const found: RequiredReview[] = [];
  const need = (skill: SkillId, reason: string, when: boolean) => {
    if (when) found.push({ skill, reason });
  };

  need("code-review", "it changes code", code.length > 0);
  need("security-review", `it changes code, at the ${stage} stage`, source.length > 0 && stage !== "prototype");
  const screens = files.filter(
    (file) => SCREEN.test(file) && tracks.some((track) => UI_KINDS.includes(track.kind) && inTrack(file, track)),
  );
  need("accessibility-review", "it changes a screen", screens.length > 0);
  need(
    "design-review",
    "it changes a screen, and the project has a design",
    screens.length > 0 && config.design !== undefined,
  );
  const contracts = (config.apis ?? []).flatMap((api) => api.contract?.location ?? []);
  const providers = (config.apis ?? [])
    .filter((api) => API_KINDS.includes(api.kind) && api.providedBy !== undefined)
    .map((api) => api.providedBy);
  const providing = tracks.filter((track) => providers.includes(track.id));
  need(
    "contract-check",
    "it changes an API or its contract",
    files.some((file) => contracts.includes(file)) ||
      source.some((file) => providing.some((track) => inTrack(file, track))),
  );
  need(
    "data-migration-review",
    "it changes a migration",
    files.some((file) => MIGRATION.test(file)),
  );
  need(
    "dependency-review",
    "it changes a dependency file or lockfile",
    files.some((file) => MANIFEST.test(file) || LOCKFILE.test(file)),
  );
  need(
    "compliance-review",
    "it changes where personal data is kept",
    files.some(
      (file) => DATA_INVENTORY.test(file) || (SCHEMA_FILE.test(file) && matches(PERSONAL_FIELD, snakeCase(read(file)))),
    ),
  );
  need(
    "ai-feature-review",
    "it changes code that calls an AI model",
    (config.project.traits ?? []).includes("ai-features") &&
      aiLibraries !== undefined &&
      source.some((file) => matches(aiLibraries, read(file))),
  );
  need(
    "infrastructure-review",
    "it changes infrastructure or deployment",
    files.some((file) => INFRASTRUCTURE_AS_CODE.test(file) || DEPLOYMENT.test(file)),
  );
  need(
    "qa-acceptance",
    "its work item has acceptance criteria, which must all hold before it ships",
    (item.acceptance?.length ?? 0) > 0 && stage !== "prototype" && files.length > 0,
  );
  need("release-readiness", "it's about to ship, at the production stage", stage === "production" && files.length > 0);

  const choices = config.activities?.verify?.reviews;
  for (const skill of choices?.require ?? []) {
    if (!found.some((review) => review.skill === skill))
      found.push({ skill, reason: "the project's config requires it" });
  }
  const skipped = new Set((choices?.skip ?? []).map((choice) => choice.skill));
  return found.filter((review) => available.includes(review.skill) && !skipped.has(review.skill));
}

const git = (root: string, args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** The branch changes are measured against: origin's default branch, or main, or master. */
function baseCommit(root: string): string | undefined {
  const candidates: string[] = [];
  try {
    candidates.push(git(root, ["symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD"]).trim());
  } catch {
    // No remote default: fall back to the usual names.
  }
  candidates.push("main", "master");
  for (const candidate of candidates.filter((name) => name !== "")) {
    try {
      return git(root, ["merge-base", "HEAD", candidate]).trim();
    } catch {
      // Not a branch in this repository; try the next.
    }
  }
  return undefined;
}

/** Every file the work has touched: committed since it left the base branch, and not yet committed. */
export function changedFiles(root: string): string[] {
  const files = new Set<string>();
  try {
    const base = baseCommit(root);
    if (base !== undefined) {
      for (const file of git(root, ["diff", "--name-only", `${base}...HEAD`]).split("\n"))
        if (file !== "") files.add(file);
    }
    for (const line of git(root, ["status", "--porcelain", "--untracked-files=all"]).split("\n")) {
      const path = line.slice(3).split(" -> ").at(-1);
      if (path !== undefined && path !== "") files.add(path.replace(/^"|"$/g, ""));
    }
  } catch {
    // Not a git repository: nothing to measure.
  }
  return [...files].sort();
}

/** The required reviews still to do on a work item, by their installed names, for next_work. */
export function reviewsToDo(
  item: WorkItem,
): { skill: SkillId; use: string; reason: string; done: boolean; result?: string }[] {
  const recorded = new Map((item.reviews ?? []).map((review) => [review.skill, review]));
  return (item.requiredReviews ?? []).map((review) => {
    const found = recorded.get(review.skill);
    return {
      ...review,
      use: renderedName(review.skill),
      done: found !== undefined,
      // A done review says what it left open, so a pass is never read as all clear (RFC 0015).
      ...(found === undefined ? {} : { result: describeResult(found.result, found.open) }),
    };
  });
}
