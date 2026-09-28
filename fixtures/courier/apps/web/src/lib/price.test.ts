import assert from "node:assert/strict";
import { test } from "node:test";
import { quote } from "./price.ts";

test("charges the base price plus a price per kilogram", () => {
  assert.equal(quote(2).toFixed(2), "5.20");
});
