import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { split } from "./split.ts";

describe("split", () => {
  it("divides an even bill equally", () => {
    assert.deepEqual(split(3000, 3), [1000, 1000, 1000]);
  });

  it("gives the leftover cents to the first people, so nothing is lost", () => {
    assert.deepEqual(split(1000, 3), [334, 333, 333]);
  });

  it("rejects fractions of a cent and nobody to pay", () => {
    assert.throws(() => split(10.5, 2), RangeError);
    assert.throws(() => split(1000, 0), RangeError);
  });
});
