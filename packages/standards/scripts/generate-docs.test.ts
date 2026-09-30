import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS_DIR, renderAll } from "./generate-docs.ts";

describe("the standards pages", () => {
  const pages = renderAll();

  it("are up to date with the rules; run pnpm --filter peer-ai-standards generate if not", () => {
    const files = readdirSync(DOCS_DIR, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(DOCS_DIR.length + 1));
    expect(files.sort()).toEqual([...pages.keys()].sort());
    for (const [file, content] of pages) expect(readFileSync(join(DOCS_DIR, file), "utf8"), file).toBe(content);
  });

  it("list every domain in the index, each with its rules", () => {
    const index = pages.get("README.md") ?? "";
    expect(index).toContain("| [Money](money.md) | 12 |");
    expect(index).not.toContain("Coming");
  });

  it("give each stack profile a page, with its defaults filled in", () => {
    expect(pages.get("README.md")).toContain("| [TypeScript](profiles/typescript.md) | `typescript` | – |");
    const page = pages.get("profiles/typescript.md") ?? "";
    expect(page).toContain("## TS-06 · Nesting stays 3 levels deep or less");
    expect(page).toContain("**Default:** 3 levels.");
  });
});
