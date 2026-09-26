import test from "node:test";
import assert from "node:assert/strict";
import { ROUND_PRESETS } from "@arc-track/core/presets";
import { buildRoundRpcArgs, configFromPreset } from "../src/round-config.ts";
import { addArrows, DEFAULT_COUNTER, readCounter, resetCounter, setIncrement, undoLastAddition } from "../src/counter-model.ts";
import { athleteLabel, mapCoachRoster, mapOwnOrganizations, normalizeJoinCode } from "../src/organization-model.ts";
import { validateMobileProfile } from "../src/profile-model.ts";

test("Round presets and custom fields map into the atomic RPC without a client round number", () => {
  const preset = ROUND_PRESETS[3];
  const defaults = buildRoundRpcArgs("session", configFromPreset(preset));
  assert.equal(defaults.p_distance_metres, preset.distanceMetres);
  assert.equal(defaults.p_planned_ends, preset.defaultEnds);
  assert.equal("p_round_number" in defaults, false);
  const custom = buildRoundRpcArgs("session", { ...configFromPreset(), name: " Indoor ", distanceMetres: 18, faceType: "triple_face", ends: 5, arrowsPerEnd: 3 });
  assert.equal(custom.p_name, "Indoor");
  assert.equal(custom.p_face_type, "triple_face");
  assert.equal(custom.p_arrows_per_end, 3);
  assert.throws(() => buildRoundRpcArgs("session", { ...configFromPreset(), ends: 0 }), /positive whole/);
  assert.throws(() => buildRoundRpcArgs("session", { ...configFromPreset(), name: " " }), /Round name/);
});

test("Counter keeps exact increments, Undo history and reset through serialized restoration", () => {
  let state = setIncrement(DEFAULT_COUNTER, 14);
  state = addArrows(addArrows(state));
  assert.equal(state.totalArrows, 28);
  state = setIncrement(state, 6);
  assert.equal(state.totalArrows, 28);
  state = addArrows(state);
  assert.equal(state.totalArrows, 34);
  state = readCounter(JSON.parse(JSON.stringify(state)));
  assert.equal(undoLastAddition(state).totalArrows, 28);
  assert.equal(undoLastAddition(undoLastAddition(state)).totalArrows, 14);
  assert.deepEqual(resetCounter(state).history, []);
  assert.equal(resetCounter(state).totalArrows, 0);
});

test("Organisation adapters show own active roles and safe coach roster labels", () => {
  const own = mapOwnOrganizations([{ organization_id: "o", role: "archer", organizations: { name: "Club" } }, { organization_id: "bad", role: "invalid", organizations: { name: "Other" } }]);
  assert.equal(own.length, 1);
  assert.equal(own[0].role, "archer");
  assert.equal(normalizeJoinCode(" abcd2345 "), "ABCD2345");
  assert.equal(normalizeJoinCode("invalid"), null);
  const roster = mapCoachRoster([{ user_id: "123456789", display_name: null, joined_at: "2026-09-26" }]);
  assert.equal(athleteLabel(roster[0]), "Archer 12345678");
});

test("Profile input trims text and rejects invalid options and excessive length", () => {
  const valid = validateMobileProfile({ display_name: " Han ", club_or_team: " ", division: "Recurve", shooting_hand: null, experience_level: "Advanced" });
  assert.equal(valid.display_name, "Han");
  assert.equal(valid.club_or_team, null);
  assert.throws(() => validateMobileProfile({ ...valid, division: "Invalid" }), /valid profile option/);
  assert.throws(() => validateMobileProfile({ ...valid, display_name: "x".repeat(81) }), /too long/);
});
