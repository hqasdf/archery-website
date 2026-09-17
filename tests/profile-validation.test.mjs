import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { validateProfileInput, profileDisplayName } from "../src/features/profile/validation.ts";

const empty = { display_name: null, club_or_team: null, division: null, shooting_hand: null, experience_level: null, bio: null };
const input = (values = {}) => {
  const form = new FormData();
  for (const field of Object.keys(empty)) form.set(field, "");
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined) form.delete(field);
    else form.set(field, value);
  }
  return form;
};

test("all profile fields are optional and blank text clears to null", () => {
  assert.deepEqual(validateProfileInput(input()), { ok: true, profile: empty });
  assert.deepEqual(validateProfileInput(input({ display_name: " \n\t", club_or_team: " ", bio: "\r\n\t " })),
    { ok: true, profile: empty });
});

test("text is trimmed and multiline bio retains internal whitespace", () => {
  const result = validateProfileInput(input({
    display_name: " Han Qian ", club_or_team: " Club ", bio: "\t \nFirst line\n\n  Second line\r\nThird line \r\n",
    division: "Barebow", shooting_hand: "Left", experience_level: "Advanced",
  }));
  assert.deepEqual(result, { ok: true, profile: {
    display_name: "Han Qian", club_or_team: "Club", division: "Barebow", shooting_hand: "Left",
    experience_level: "Advanced", bio: "First line\n\n  Second line\r\nThird line",
  } });
});

test("text limits count Unicode code points and apply after trimming", () => {
  for (const [field, limit] of [["display_name",80],["club_or_team",120],["bio",500]]) {
    for (const character of ["a", "弓", "🏹"]) {
      assert.equal(validateProfileInput(input({ [field]: " \n" + character.repeat(limit) + "\t " })).ok, true);
      assert.equal(validateProfileInput(input({ [field]: character.repeat(limit+1) })).ok, false);
    }
  }
});

test("missing fields, files, and null bytes are rejected", () => {
  for (const field of Object.keys(empty)) {
    for (const value of [undefined, new Blob(["text"])]) {
      assert.equal(validateProfileInput(input({ [field]: value })).ok, false);
    }
  }
  for (const field of ["display_name","club_or_team","bio"]) {
    for (const value of ["bad\0text"]) {
      assert.equal(validateProfileInput(input({ [field]: value })).ok, false);
    }
  }
});

test("only approved dropdown values are accepted", () => {
  for (const [field, values] of [
    ["division", ["Recurve","Compound","Barebow","Other"]],
    ["shooting_hand", ["Left","Right"]],
    ["experience_level", ["Beginner","Intermediate","Advanced"]],
  ]) {
    for (const value of values) assert.equal(validateProfileInput(input({ [field]: value })).ok, true);
    for (const value of ["invalid", "Competitive", " "]) assert.equal(validateProfileInput(input({ [field]: value })).ok, false);
  }
});

test("extra ownership, email, password and timestamp fields are not saved", () => {
  const form = input({ display_name: "Archer", id: "other", email: "other@example.invalid", password: "not-a-profile-field", updated_at: "2099-01-01" });
  assert.deepEqual(validateProfileInput(form), { ok: true, profile: { ...empty, display_name: "Archer" } });
});

test("personalization uses the full saved name and a neutral blank fallback", () => {
  for (const value of [null, undefined, "", " \t\n"]) assert.equal(profileDisplayName(value), "Archer");
  assert.equal(profileDisplayName(" Han Qian "), "Han Qian");
});

test("SQL bio trim characters exactly match JavaScript trim behavior", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260917150016_extend_profile_details.sql", import.meta.url), "utf8");
  const match = sql.match(/btrim\(bio, U&'([^']+)'\)/);
  assert.ok(match);
  const sqlWhitespace = match[1].replace(/\\([0-9A-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex,16)));
  const jsWhitespace = Array.from({ length: 65536 }, (_, code) => String.fromCharCode(code))
    .filter((character) => character.trim() === "").join("");
  assert.equal(sqlWhitespace, jsWhitespace);
  for (const character of sqlWhitespace) {
    const result = validateProfileInput(input({ bio: character + "Line one\nLine two" + character }));
    assert.equal(result.ok, true);
    assert.equal(result.profile.bio, "Line one\nLine two");
    assert.equal(validateProfileInput(input({ bio: character })).profile.bio, null);
  }
});
