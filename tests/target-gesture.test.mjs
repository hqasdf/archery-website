import test from "node:test";
import assert from "node:assert/strict";
import { calculatePinchTransform, clientToSvg, inverseTargetTransform, plotFromSvg, shouldCommitTargetTap, shouldPlotTargetSurface } from "../src/features/sessions/target-gesture.ts";

test("client coordinates map to SVG coordinates and invert target zoom", () => {
  const svg = clientToSvg({ x: 150, y: 100 }, { left: 50, top: 50, width: 200, height: 100 }, { x: -100, y: -50, width: 200, height: 100 });
  assert.deepEqual(svg, { x: 0, y: 0 });
  assert.deepEqual(inverseTargetTransform({ x: 30, y: -10 }, { scale: 2, panX: 10, panY: 10 }), { x: 10, y: -10 });
});

test("pinch preserves its target anchor while zooming and panning", () => {
  const transform = calculatePinchTransform({ scale: 1, panX: 0, panY: 0 }, { x: 10, y: 20 }, 100, { x: 15, y: 25 }, 200);
  assert.deepEqual(transform, { scale: 2, panX: -5, panY: -15 });
  assert.deepEqual(inverseTargetTransform({ x: 15, y: 25 }, transform), { x: 10, y: 20 });
  assert.equal(calculatePinchTransform(transform, { x: 0, y: 0 }, 100, { x: 0, y: 0 }, 1000).scale, 4);
});

test("triple target mapping keeps local coordinates and chooses the nearest face", () => {
  assert.deepEqual(plotFromSvg({ x: 20, y: -100 }, "triple_face", [-110, 0, 110]), { x: 0.2, y: 0.1, faceIndex: 0 });
  assert.deepEqual(plotFromSvg({ x: -10, y: 15 }, "triple_face", [-110, 0, 110]), { x: -0.1, y: 0.15, faceIndex: 1 });
  assert.deepEqual(plotFromSvg({ x: 0, y: 120 }, "triple_face", [-110, 0, 110]), { x: 0, y: 0.1, faceIndex: 2 });
});

test("only an unmoved single-pointer interaction commits a plot", () => {
  assert.equal(shouldCommitTargetTap({ moved: false, hadMultiTouch: false, suppressed: false, pointerCount: 1 }), true);
  assert.equal(shouldCommitTargetTap({ moved: false, hadMultiTouch: true, suppressed: false, pointerCount: 1 }), false);
  assert.equal(shouldCommitTargetTap({ moved: false, hadMultiTouch: false, suppressed: true, pointerCount: 1 }), false);
  assert.equal(shouldCommitTargetTap({ moved: true, hadMultiTouch: false, suppressed: false, pointerCount: 1 }), false);
});

test("target surface plots only the current Arrow and keeps gestures mutually safe", () => {
  assert.equal(shouldPlotTargetSurface({ hasSelectedArrow: false, moved: false, hadMultiTouch: false, suppressed: false, pointerCount: 1 }), true);
  assert.equal(shouldPlotTargetSurface({ hasSelectedArrow: true, moved: false, hadMultiTouch: false, suppressed: false, pointerCount: 1 }), true);
  assert.equal(shouldPlotTargetSurface({ hasSelectedArrow: true, moved: true, hadMultiTouch: false, suppressed: false, pointerCount: 1 }), true);
  assert.equal(shouldPlotTargetSurface({ hasSelectedArrow: false, moved: true, hadMultiTouch: false, suppressed: false, pointerCount: 1 }), false);
  assert.equal(shouldPlotTargetSurface({ hasSelectedArrow: true, moved: true, hadMultiTouch: true, suppressed: false, pointerCount: 1 }), false);
  assert.equal(shouldPlotTargetSurface({ hasSelectedArrow: true, moved: false, hadMultiTouch: false, suppressed: true, pointerCount: 1 }), false);
});
