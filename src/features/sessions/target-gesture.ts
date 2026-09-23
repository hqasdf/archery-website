import type { Plot, TargetFaceType } from "./scoring-model";

export type TargetPoint = { x: number; y: number };
export type TargetView = { x: number; y: number; width: number; height: number };
export type TargetTransform = { scale: number; panX: number; panY: number };
export const IDENTITY_TARGET_TRANSFORM: TargetTransform = { scale: 1, panX: 0, panY: 0 };

export function clientToSvg(point: TargetPoint, rect: Pick<DOMRect, "left" | "top" | "width" | "height">, view: TargetView): TargetPoint {
  return { x: view.x + (point.x - rect.left) / rect.width * view.width, y: view.y + (point.y - rect.top) / rect.height * view.height };
}
export function inverseTargetTransform(point: TargetPoint, transform: TargetTransform): TargetPoint {
  return { x: (point.x - transform.panX) / transform.scale, y: (point.y - transform.panY) / transform.scale };
}
export function plotFromSvg(point: TargetPoint, faceType: TargetFaceType, tripleCentres: readonly number[]): Plot {
  if (faceType !== "triple_face") return { x: point.x / 100, y: point.y / 100 };
  let faceIndex: 0 | 1 | 2 = 0;
  if (Math.abs(point.y - tripleCentres[1]) < Math.abs(point.y - tripleCentres[faceIndex])) faceIndex = 1;
  if (Math.abs(point.y - tripleCentres[2]) < Math.abs(point.y - tripleCentres[faceIndex])) faceIndex = 2;
  return { x: point.x / 100, y: (point.y - tripleCentres[faceIndex]) / 100, faceIndex };
}
export function midpoint(a: TargetPoint, b: TargetPoint): TargetPoint { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
export function distanceBetween(a: TargetPoint, b: TargetPoint) { return Math.hypot(b.x - a.x, b.y - a.y); }
export function calculatePinchTransform(start: TargetTransform, startMidpoint: TargetPoint, startDistance: number, currentMidpoint: TargetPoint, currentDistance: number, maximumScale = 4): TargetTransform {
  const scale = Math.min(maximumScale, Math.max(1, start.scale * currentDistance / Math.max(startDistance, 1)));
  const anchor = inverseTargetTransform(startMidpoint, start);
  return { scale, panX: currentMidpoint.x - anchor.x * scale, panY: currentMidpoint.y - anchor.y * scale };
}
export function shouldCommitTargetTap(input: { moved: boolean; hadMultiTouch: boolean; suppressed: boolean; pointerCount: number }) {
  return !input.moved && !input.hadMultiTouch && !input.suppressed && input.pointerCount === 1;
}

/** A target surface gesture plots the current Arrow, including a moved selected Arrow. */
export function shouldPlotTargetSurface(input: {
  hasSelectedArrow: boolean;
  moved: boolean;
  hadMultiTouch: boolean;
  suppressed: boolean;
  pointerCount: number;
}) {
  if (input.hadMultiTouch || input.suppressed || input.pointerCount !== 1) return false;
  return input.hasSelectedArrow || !input.moved;
}
