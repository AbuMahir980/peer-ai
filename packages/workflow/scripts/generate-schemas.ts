// Writes the JSON Schema files that editors use to autocomplete and check peer-ai.config.json
// and the state files. The Zod definitions in src/ are the source; a test fails if the
// committed files fall behind them.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigLayerSchema, ConfigSchema } from "../src/config.ts";
import { MapSchema, WorkItemSchema } from "../src/state.ts";

export const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

export const SCHEMAS = {
  "config.schema.json": ConfigSchema,
  "config-layer.schema.json": ConfigLayerSchema,
  "map.schema.json": MapSchema,
  "work-item.schema.json": WorkItemSchema,
} as const;

export function render(schema: z.ZodType): string {
  return `${JSON.stringify(z.toJSONSchema(schema, { io: "input", unrepresentable: "throw" }), null, 2)}\n`;
}

const invokedDirectly = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  for (const [file, schema] of Object.entries(SCHEMAS)) {
    writeFileSync(join(SCHEMA_DIR, file), render(schema));
    console.log(`wrote schemas/${file}`);
  }
}
