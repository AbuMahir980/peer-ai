import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { z } from "zod";
import { ConfigLayerSchema, ConfigSchema, resolveConfig, type PeerAiConfig } from "./config.ts";
import { ReviewReportSchema, type ReviewReport } from "./report.ts";
import { MapSchema, WorkItemSchema, type ProjectMap, type WorkItem } from "./state.ts";

export * from "./ids.ts";
export { ConfigLayerSchema, ConfigSchema, mergeConfigs, resolveConfig, type PeerAiConfig } from "./config.ts";
export {
  ReviewReportSchema,
  SEVERITIES,
  deriveResult,
  type ReviewReport,
  type ReviewResult,
  type Severity,
} from "./report.ts";
export {
  MapItemIdSchema,
  MapSchema,
  WorkItemIdSchema,
  WorkItemSchema,
  type ProjectMap,
  type WorkItem,
} from "./state.ts";

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function validate<T>(schema: z.ZodType<T>, input: unknown): Validation<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const where = issue.path.length === 0 ? "(root)" : issue.path.map(String).join(".");
      return `${where}: ${issue.message}`;
    }),
  };
}

/** Validates a resolved config: one with no `extends` left, or the result of `resolveConfig`. */
export const validateConfig = (input: unknown): Validation<PeerAiConfig> => validate(ConfigSchema, input);

export const CONFIG_FILE = "peer-ai.config.json";

/** Reads peer-ai.config.json, following a relative `extends`. Returns errors instead of throwing. */
export function readConfig(root: string): { config?: PeerAiConfig; errors?: string[] } {
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
export const validateConfigLayer = (input: unknown): Validation<z.output<typeof ConfigLayerSchema>> =>
  validate(ConfigLayerSchema, input);
export const validateMap = (input: unknown): Validation<ProjectMap> => validate(MapSchema, input);
export const validateWorkItem = (input: unknown): Validation<WorkItem> => validate(WorkItemSchema, input);
export const validateReport = (input: unknown): Validation<ReviewReport> => validate(ReviewReportSchema, input);
