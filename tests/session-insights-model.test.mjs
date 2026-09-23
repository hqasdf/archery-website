import test from "node:test";
import assert from "node:assert/strict";
import { calculateEndAnalysis, calculateGroupingMetrics, calculateRoundGroupingInsights } from "../src/features/sessions/session-insights-model.ts";

function arrow(id, score, end, plot = null) { return { id, end, arrow: Number(id.replace(/\D/g, "")) || 1, score, plot, syncState: "saved" }; }
function round(overrides = {}) { return { id: "round", roundNumber: 1, name: "Round", division: "Recurve", distanceMetres: 70, ends: 1, arrowsPerEnd: 3, faceDiameterCm: 122, faceType: "full_face", arrows: [], ...overrides }; }

test("End summaries exclude partial Ends while retaining them in chart data", () => {
  const analyzed = calculateEndAnalysis(round({ ends: 3, arrowsPerEnd: 3, arrows: [
    arrow("e1", "10", 1), arrow("e2", "9", 1), arrow("e3", "8", 1),
    arrow("e4", "1", 2),
    arrow("e5", "6", 3), arrow("e6", "6", 3), arrow("e7", "6", 3),
  ] }));
  assert.deepEqual(analyzed.ends.map((end) => [end.endNumber, end.complete, end.average]), [[1, true, 9], [2, false, 1], [3, true, 6]]);
  assert.equal(analyzed.best?.endNumber, 1);
  assert.equal(analyzed.worst?.endNumber, 3);
  assert.equal(analyzed.average, 7.5);
  assert.equal(analyzed.consistency, 1.5);
  assert.equal(analyzed.trendSlope, -1.5);
});

test("Consistency and trend require two completed Ends", () => {
  const analyzed = calculateEndAnalysis(round({ ends: 2, arrowsPerEnd: 2, arrows: [arrow("e1", "10", 1), arrow("e2", "8", 1), arrow("e3", "X", 2)] }));
  assert.equal(analyzed.completedEndCount, 1);
  assert.equal(analyzed.consistency, null);
  assert.equal(analyzed.trendSlope, null);
});

test("Grouping centre, group size and RMS spread convert from face radius to centimetres", () => {
  const result = calculateGroupingMetrics([{ x: -0.1, y: 0 }, { x: 0.1, y: 0 }, { x: 0, y: 0.3 }], 40);
  assert.equal(result?.centreX, 0);
  assert.ok(Math.abs(result.centreY - 0.1) < 1e-12);
  assert.ok(Math.abs(result.spreadNormalized - Math.sqrt(0.08 / 3)) < 1e-12);
  assert.ok(Math.abs(result.spreadCm - Math.sqrt(0.08 / 3) * 20) < 1e-12);
  assert.ok(Math.abs(result.groupSizeNormalized - Math.sqrt(0.1)) < 1e-12);
  assert.ok(Math.abs(result.groupSizeCm - Math.sqrt(0.1) * 20) < 1e-12);
});

test("Group size and spread require at least three plotted Arrows", () => {
  const result = calculateGroupingMetrics([{ x: 0, y: 0 }, { x: 1, y: 1 }], 122);
  assert.equal(result?.groupSizeCm, null);
  assert.equal(result?.spreadCm, null);
});

test("Triple-face grouping combines local coordinates and keeps face indexes for rendering", () => {
  const result = calculateRoundGroupingInsights(round({ faceDiameterCm: 40, faceType: "triple_face", arrows: [
    arrow("a1", "9", 1, { x: 0.1, y: 0.1, faceIndex: 0 }),
    arrow("a2", "9", 1, { x: 0.1, y: 0.1, faceIndex: 1 }),
    arrow("a3", "9", 1, { x: 0.1, y: 0.1, faceIndex: 2 }),
    arrow("a4", "8", 1, { x: 0.2, y: 0.2 }),
  ] }));
  assert.deepEqual(result.arrows.map((item) => item.faceIndex), [0, 1, 2]);
  assert.equal(result.unassignedTripleCount, 1);
  assert.equal(result.metrics?.groupSizeCm, 0);
  assert.ok(Math.abs(result.metrics?.spreadCm ?? 1) < 1e-12);
});
