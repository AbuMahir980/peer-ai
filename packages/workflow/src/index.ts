import type { z } from "zod";
import { ConfigSchema, type PeerAiConfig } from "./config.ts";
import { MapSchema, WorkItemSchema, type ProjectMap, type WorkItem } from "./state.ts";

export * from "./ids.ts";
export { ConfigSchema, type PeerAiConfig } from "./config.ts";
export { MapItemIdSchema, MapSchema, WorkItemSchema, type ProjectMap, type WorkItem } from "./state.ts";

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

export const validateConfig = (input: unknown): Validation<PeerAiConfig> => validate(ConfigSchema, input);
export const validateMap = (input: unknown): Validation<ProjectMap> => validate(MapSchema, input);
export const validateWorkItem = (input: unknown): Validation<WorkItem> => validate(WorkItemSchema, input);
