import { afterEach, describe, expect, it } from "vitest";
import { reviewSizes } from "./review-cost.ts";
import { cleanUp, project } from "./test-helpers.ts";

afterEach(cleanUp);

const lines = (count: number) =>
  Array.from({ length: count }, (_, i) => `export const v${String(i)} = ${String(i)};`).join("\n");

describe("a rough cost before a whole-project review (RFC 0016)", () => {
  it("is each review's scope, in files, lines and rules, as small, medium or large", () => {
    const root = project({
      "apps/web/Cart.tsx": lines(40),
      "services/api/part0.py": lines(5_000),
      "services/api/part1.py": lines(5_000),
      "services/api/part2.py": lines(5_000),
      "services/api/part3.py": lines(5_000),
      "services/api/part4.py": lines(5_000),
      "services/api/part5.py": lines(5_000),
      "services/api/migrations/0001_orders.py": lines(20),
      "services/api/tests/test_orders.py": lines(500),
    });
    const sizes = reviewSizes(root);
    expect(sizes["accessibility-review"]).toMatchObject({
      files: 1,
      lines: 40,
      size: "small",
      tokens: "under 150,000 tokens",
    });
    expect(sizes["data-migration-review"]).toMatchObject({ files: 1, size: "small" });
    // The test file is left out of a security review's scope; the large source file isn't.
    expect(sizes["security-review"]).toMatchObject({
      files: 8,
      lines: 30_060,
      size: "large",
      tokens: "over 600,000 tokens",
    });
    expect(sizes["security-review"]?.rules).toBeGreaterThan(0);
    expect(sizes["requirements-analysis" as keyof typeof sizes]).toBeUndefined();
  });
});
