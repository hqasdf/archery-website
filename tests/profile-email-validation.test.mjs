import assert from "node:assert/strict";
import test from "node:test";
import { validateEmailChange } from "../src/features/profile/email-validation.ts";

function form(value) {
  const input = new FormData();
  if (value !== undefined) input.set("email", value);
  return input;
}

test("email change rejects missing, malformed and file-valued input", () => {
  for (const email of [undefined, "", " ", "bad", "a@@b.com", "a b@example.com", "a@b", "a\0@example.com", "a".repeat(255) + "@example.com", new Blob(["email"])]) {
    assert.equal(validateEmailChange(form(email), "current@example.com").ok, false);
  }
});

test("email change rejects current email regardless of case or outside whitespace", () => {
  assert.equal(validateEmailChange(form(" Current@Example.com "), "current@example.com").ok, false);
});

test("email change trims a valid different address and ignores supplied identity", () => {
  const input = form("  new+test@example.com  ");
  input.set("id", "other-user");
  input.set("currentEmail", "different@example.com");
  assert.deepEqual(validateEmailChange(input, "current@example.com"), { ok: true, email: "new+test@example.com" });
});
