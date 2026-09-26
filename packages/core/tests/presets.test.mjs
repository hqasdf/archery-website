import assert from "node:assert/strict";
import test from "node:test";
import { DIVISIONS, ROUND_PRESETS, TARGET_FACE_OPTIONS } from "../src/round-presets.ts";

test("existing divisions, target faces, and Round defaults are preserved", () => {
  assert.deepEqual(DIVISIONS, ["Recurve", "Compound", "Barebow", "Other"]);
  assert.deepEqual(ROUND_PRESETS.map(({ distanceMetres, defaultEnds, defaultArrowsPerEnd }) =>
    [distanceMetres, defaultEnds, defaultArrowsPerEnd]), [
    [18, 10, 3], [30, 6, 6], [50, 6, 6], [70, 6, 6],
  ]);
  assert.deepEqual(TARGET_FACE_OPTIONS.map(({ id }) => id),
    ["122-full", "80-full", "40-full", "40-triple", "80-six"]);
});
