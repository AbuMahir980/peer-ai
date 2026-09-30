import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMAS, SCHEMA_DIR, render } from "./generate-schemas.ts";

describe("the committed JSON Schema files", () => {
  it.each(Object.entries(SCHEMAS))("%s matches the Zod source", (file, schema) => {
    const committed = readFileSync(join(SCHEMA_DIR, file), "utf8");
    expect(committed, `schemas/${file} is out of date: run pnpm --filter peer-ai-workflow generate`).toBe(
      render(schema),
    );
  });
});
