import assert from "node:assert/strict";
import test from "node:test";
import { endTotal, points, roundTotal, scoreFromPlot, xCount } from "../src/scoring-model.ts";

test("target boundaries retain the higher ring score, including X and Miss", () => {
  for (const [radius, expected] of [
    [0.05, "X"], [0.10, "10"], [0.20, "9"], [0.30, "8"],
    [0.40, "7"], [0.50, "6"], [0.60, "5"], [0.70, "4"],
    [0.80, "3"], [0.90, "2"], [1.00, "1"], [1.01, "M"],
  ]) {
    assert.equal(scoreFromPlot({ x: radius, y: 0 }), expected);
  }
  assert.equal(scoreFromPlot({ x: 0.61, y: 0 }, "six_ring"), "M");
  assert.equal(scoreFromPlot({ x: 0.51, y: 0, faceIndex: 0 }, "triple_face"), "M");
});

test("X contributes ten points and End totals use only their own arrows", () => {
  const arrows = [
    { end: 1, arrow: 1, score: "X" },
    { end: 1, arrow: 2, score: "9" },
    { end: 2, arrow: 1, score: "M" },
  ];
  assert.equal(points("X"), 10);
  assert.equal(roundTotal(arrows), 19);
  assert.equal(endTotal(arrows, 1), 19);
  assert.equal(endTotal(arrows, 2), 0);
  assert.equal(xCount(arrows), 1);
});
