import assert from "node:assert/strict";
import test from "node:test";
import {
  callbackDestination,
  parseAuthConfig,
} from "../src/lib/auth/config.ts";
import { validateAuthInput, validateVerificationInput } from "../src/features/auth/validation.ts";

test("verification preserves leading zeros and accepts surrounding pasted whitespace", () => {
  const data = new FormData();
  data.set("email", " archer@example.com ");
  data.set("code", " 012345 ");
  assert.deepEqual(validateVerificationInput(data), { ok: true, email: "archer@example.com", token: "012345" });
});

test("verification rejects malformed codes and file fields", () => {
  for (const code of ["", "12345", "1234567", "12 345", "abcdef", "１２３４５６", new Blob(["123456"])]) {
    const data = new FormData();
    data.set("email", "archer@example.com");
    data.set("code", code);
    assert.equal(validateVerificationInput(data).ok, false);
  }
});

test("requesting another code needs a valid email but no code", () => {
  const data = new FormData();
  data.set("email", "archer@example.com");
  assert.equal(validateVerificationInput(data, false).ok, true);
  data.set("email", "invalid");
  assert.equal(validateVerificationInput(data, false).ok, false);
  data.set("code", "012345");
  assert.equal(validateVerificationInput(data).ok, false);
});

const config = {
  url: "https://example.supabase.co",
  key: "sb_publishable_test_fixture",
  appUrl: "http://127.0.0.1:3000",
};
const form = (fields) => {
  const data = new FormData();
  Object.entries(fields).forEach(([name, value]) => data.set(name, value));
  return data;
};

test("missing configuration never enables authentication", () => {
  for (const key of ["url", "key", "appUrl"]) {
    assert.equal(parseAuthConfig({ ...config, [key]: "" }), null);
  }
  assert.ok(parseAuthConfig(config));
});

test("secret keys and credentials in URLs are rejected", () => {
  assert.equal(
    parseAuthConfig({ ...config, key: "sb_secret_do_not_use" }),
    null,
  );
  assert.equal(
    parseAuthConfig({
      ...config,
      url: "https://user:password@example.supabase.co",
    }),
    null,
  );
  assert.equal(
    parseAuthConfig({ ...config, appUrl: "https://example.com/?next=bad" }),
    null,
  );
});

test("unencrypted remote origins are rejected while local development is allowed", () => {
  assert.equal(
    parseAuthConfig({ ...config, url: "http://example.supabase.co" }),
    null,
  );
  assert.equal(
    parseAuthConfig({ ...config, appUrl: "javascript:alert(1)" }),
    null,
  );
  assert.ok(parseAuthConfig({ ...config, appUrl: "https://arc.example.com/" }));
});

test("callback destinations cannot escape to an attacker-controlled URL", () => {
  for (const path of [
    null,
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "/update-password?next=https://attacker.example",
    "%2F%2Fattacker.example",
  ]) {
    assert.equal(callbackDestination(path), "/dashboard");
  }
  assert.equal(callbackDestination("/update-password"), "/update-password");
});

test("server validation rejects missing, malformed, and file-valued email fields", () => {
  for (const email of [
    "",
    "missing-at",
    "a@b",
    "a b@example.com",
    new Blob(["a@example.com"]),
  ]) {
    assert.equal(
      validateAuthInput("forgot-password", form({ email })).ok,
      false,
    );
  }
});

test("new passwords must match and respect length limits", () => {
  for (const password of ["short", "a".repeat(129)]) {
    assert.equal(
      validateAuthInput(
        "update-password",
        form({ password, confirmPassword: password }),
      ).ok,
      false,
    );
  }
  assert.equal(
    validateAuthInput(
      "update-password",
      form({
        password: "long passphrase",
        confirmPassword: "different passphrase",
      }),
    ).ok,
    false,
  );
  assert.equal(
    validateAuthInput(
      "update-password",
      form({ password: "long passphrase", confirmPassword: "long passphrase" }),
    ).ok,
    true,
  );
});

test("email whitespace is removed without silently changing the password", () => {
  const password = "  a long passphrase  ";
  const result = validateAuthInput(
    "sign-up",
    form({
      email: " archer@example.com ",
      password,
      confirmPassword: password,
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.email, "archer@example.com");
  assert.equal(result.password, password);
});

test("sign-in allows existing shorter passwords but never an empty password", () => {
  assert.equal(
    validateAuthInput(
      "sign-in",
      form({ email: "archer@example.com", password: "old-pass" }),
    ).ok,
    true,
  );
  assert.equal(
    validateAuthInput(
      "sign-in",
      form({ email: "archer@example.com", password: "" }),
    ).ok,
    false,
  );
});
