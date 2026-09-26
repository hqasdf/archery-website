import test from "node:test";
import assert from "node:assert/strict";
import { ROUND_PRESETS } from "@arc-track/core/presets";
import {
  buildDefaultRoundRpcArgs,
  buildSessionInsertPayload,
  mapSessionInsertResult,
  mapRoundCreationResult,
} from "../src/session-write-model.ts";

test("Session insert uses the authenticated owner and the current Session fields", () => {
  assert.deepEqual(buildSessionInsertPayload("user-123", {
    title: "  Evening practice  ", date: "2026-09-26", sessionType: "training",
  }), {
    user_id: "user-123", title: "Evening practice", session_date: "2026-09-26", session_type: "training",
  });
});

test("blank Session title uses the web default; invalid date and type are rejected", () => {
  assert.equal(buildSessionInsertPayload("user-123", {
    title: "", date: "2026-09-26", sessionType: "competition",
  }).title, "Practice session");
  assert.throws(() => buildSessionInsertPayload("user-123", {
    title: "Practice", date: "not-a-date", sessionType: "training",
  }), /valid Session date/);
  assert.throws(() => buildSessionInsertPayload("user-123", {
    title: "Practice", date: "2026-09-26", sessionType: "other",
  }), /valid Session type/);
});

test("Session insert result maps saved values and hides Supabase write errors", () => {
  assert.deepEqual(mapSessionInsertResult({ id: "session-123", title: "Practice", session_date: "2026-09-26", session_type: "training", arrow_count: 0 }, false), {
    id: "session-123", title: "Practice", date: "2026-09-26", type: "training", arrowCount: 0,
  });
  assert.throws(() => mapSessionInsertResult(null, true), /Session could not be created/);
});

test("default Round RPC args reuse the web shared 70m preset", () => {
  const preset = ROUND_PRESETS[3];
  assert.deepEqual(buildDefaultRoundRpcArgs("session-123"), {
    p_session_id: "session-123",
    p_name: preset.name,
    p_division: "Recurve",
    p_distance_metres: preset.distanceMetres,
    p_face_diameter_cm: preset.faceDiameterCm,
    p_face_type: preset.faceType,
    p_planned_ends: preset.defaultEnds,
    p_arrows_per_end: preset.defaultArrowsPerEnd,
  });
});

test("Round RPC result preserves the database Round id and number", () => {
  assert.deepEqual(mapRoundCreationResult({ round_id: "round-123", round_number: 7 }, false), {
    roundId: "round-123", roundNumber: 7,
  });
});

test("Round RPC errors are safe and do not expose Supabase details", () => {
  assert.throws(() => mapRoundCreationResult(null, true), (error) => {
    assert.equal(error.message, "The Round could not be created. Check your connection and try again.");
    return !error.message.includes("SQL") && !error.message.includes("token");
  });
  assert.throws(() => mapRoundCreationResult({ round_id: "round-123", round_number: 0 }, false), /could not be created/);
});
