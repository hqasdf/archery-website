import test from "node:test";
import assert from "node:assert/strict";
import { formatDateOnly, formatWeekRange } from "../src/date.ts";

test("date-only labels are deterministic across month and year boundaries", () => {
  assert.equal(formatDateOnly("2026-09-22"), "22 Sep 2026");
  assert.equal(formatDateOnly("2026-09-22", false), "22 Sep");
  assert.equal(formatWeekRange("2026-09-21", "2026-09-27"), "21–27 Sep");
  assert.equal(formatWeekRange("2026-12-28", "2027-01-03"), "28 Dec–3 Jan");
});
