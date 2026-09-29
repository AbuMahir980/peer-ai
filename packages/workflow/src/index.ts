import type { z } from "zod";
import { ConfigLayerSchema, ConfigSchema, type PeerAiConfig } from "./config.ts";
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
export const validateConfigLayer = (input: unknown): Validation<z.output<typeof ConfigLayerSchema>> =>
  validate(ConfigLayerSchema, input);
export const validateMap = (input: unknown): Validation<ProjectMap> => validate(MapSchema, input);
export const validateWorkItem = (input: unknown): Validation<WorkItem> => validate(WorkItemSchema, input);
export const validateReport = (input: unknown): Validation<ReviewReport> => validate(ReviewReportSchema, input);
