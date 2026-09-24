import test from "node:test";
import assert from "node:assert/strict";
import { normalizeJoinCode, validateOrganizationName } from "../src/features/organizations/validation.ts";

test("organisation names are trimmed and bounded", () => {
  assert.deepEqual(validateOrganizationName({ name: "  Range Club  " }), { ok: true, name: "Range Club" });
  assert.equal(validateOrganizationName({ name: "  " }).ok, false);
  assert.equal(validateOrganizationName({ name: "x".repeat(121) }).ok, false);
});

test("join codes ignore outer whitespace and input case", () => {
  assert.equal(normalizeJoinCode("  ab7k4m2q  "), "AB7K4M2Q");
  assert.equal(normalizeJoinCode("AB7K4M2"), null);
  assert.equal(normalizeJoinCode("AB7K4M2O"), null);
  assert.equal(normalizeJoinCode("AB7K4M2!"), null);
});
