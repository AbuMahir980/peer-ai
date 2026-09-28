import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS_DIR, renderAll } from "./generate-docs.ts";

describe("the standards pages", () => {
  const pages = renderAll();

  it("are up to date with the rules; run pnpm --filter @peer-ai/standards generate if not", () => {
    expect(readdirSync(DOCS_DIR).sort()).toEqual([...pages.keys()].sort());
    for (const [file, content] of pages) expect(readFileSync(join(DOCS_DIR, file), "utf8"), file).toBe(content);
  });

  it("list every domain in the index, marking the ones still to come", () => {
    const index = pages.get("README.md") ?? "";
    expect(index).toContain("| [Money](money.md) | 12 |");
    expect(index).toContain("| Delivery | Coming |");
  });
});
