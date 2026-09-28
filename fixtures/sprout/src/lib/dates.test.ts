import { expect, test } from "vitest";
import { today, wateredToday } from "./dates";

test("a plant watered today counts as watered today", () => {
  expect(wateredToday(today())).toBe(true);
});
