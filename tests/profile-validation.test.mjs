import assert from "node:assert/strict";
import test from "node:test";
import { validateProfileInput } from "../src/features/profile/validation.ts";

const input = (value) => {
  const form = new FormData();
  if (value !== undefined) form.set("display_name", value);
  return form;
};

test("profile names are trimmed and blank names clear to null", () => {
  assert.deepEqual(validateProfileInput(input("  Han Qian  ")), { ok: true, displayName: "Han Qian" });
  for (const name of ["", "   ", "\n\t"]) {
    assert.deepEqual(validateProfileInput(input(name)), { ok: true, displayName: null });
  }
});

test("profile limits match PostgreSQL Unicode character counts", () => {
  for (const character of ["a", "弓", "🏹"]) {
    assert.equal(validateProfileInput(input(character.repeat(80))).ok, true);
    assert.equal(validateProfileInput(input(character.repeat(81))).ok, false);
  }
});

test("missing, file-valued, and null-byte profile names are rejected", () => {
  for (const value of [undefined, new Blob(["name"]), "bad\0name"]) {
    assert.equal(validateProfileInput(input(value)).ok, false);
  }
});

test("extra submitted ownership and email fields never enter the update payload", () => {
  const form = input("Archer");
  form.set("id", "another-user");
  form.set("email", "someone@example.com");
  form.set("updated_at", "2099-01-01");
  assert.deepEqual(validateProfileInput(form), { ok: true, displayName: "Archer" });
});
