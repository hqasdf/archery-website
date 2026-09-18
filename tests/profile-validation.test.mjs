import assert from "node:assert/strict";
import test from "node:test";
import { validateProfileInput, profileDisplayName } from "../src/features/profile/validation.ts";

const empty = { display_name: null, club_or_team: null, division: null, shooting_hand: null, experience_level: null };
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
  assert.deepEqual(validateProfileInput(input({ display_name: " \n\t", club_or_team: " " })),
    { ok: true, profile: empty });
});

test("profile text is trimmed", () => {
  assert.equal(validateProfileInput(input({ display_name: " Han ", club_or_team: " Club " })).profile.club_or_team, "Club");
});

test("text limits count Unicode code points and apply after trimming", () => {
  for (const [field, limit] of [["display_name",80],["club_or_team",120]]) {
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
  for (const field of ["display_name","club_or_team"]) {
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

test("removed bio input never enters the save payload", () => {
  assert.deepEqual(validateProfileInput(input({ bio: "ignored" })), { ok: true, profile: empty });
});
