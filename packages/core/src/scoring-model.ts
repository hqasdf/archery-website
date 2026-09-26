import type { Division } from "./round-presets.ts";
export type ScoreLabel = "X"|"10"|"9"|"8"|"7"|"6"|"5"|"4"|"3"|"2"|"1"|"M";
export type TargetFaceType = "full_face"|"six_ring"|"triple_face";
export type Plot = { x: number; y: number; faceIndex?: 0|1|2 };
export type ArrowSyncState = "saving"|"saved"|"failed";
export type SessionType = "training"|"competition";
export type ArrowEntry = { id: string; end: number; arrow: number; score: ScoreLabel; plot: Plot|null; syncState?: ArrowSyncState };
export type RoundDraft = { id: string; roundNumber: number; name: string; division: Division; distanceMetres: number; ends: number; arrowsPerEnd: number; faceDiameterCm: number; faceType: TargetFaceType; arrows: ArrowEntry[] };
export type SessionDraft = { id: string; title: string; date: string; sessionType: SessionType; arrowCount: number; rounds: RoundDraft[] };
export const SCORE_LABELS: ScoreLabel[] = ["X","10","9","8","7","6","5","4","3","2","1","M"];
export function scoreFromPlot({ x, y }: Plot, faceType: TargetFaceType = "full_face"): ScoreLabel {
  const distance = Math.hypot(x, y);
  if (faceType === "six_ring" && distance > 0.60) return "M";
  if (faceType === "triple_face" && distance > 0.50) return "M";
  if (distance <= 0.05) return "X";
  if (distance <= 0.10) return "10";
  if (distance <= 0.20) return "9";
  if (distance <= 0.30) return "8";
  if (distance <= 0.40) return "7";
  if (distance <= 0.50) return "6";
  if (distance <= 0.60) return "5";
  if (distance <= 0.70) return "4";
  if (distance <= 0.80) return "3";
  if (distance <= 0.90) return "2";
  if (distance <= 1.00) return "1";
  return "M";
}
export function points(score: ScoreLabel) { return score === "X" ? 10 : score === "M" ? 0 : Number(score); }
export function roundTotal(arrows: ArrowEntry[]) { return arrows.reduce((sum, item) => sum + points(item.score), 0); }
export function arrowAverage(arrows: ArrowEntry[]) { return arrows.length === 0 ? null : roundTotal(arrows) / arrows.length; }
export function formatArrowAverage(arrows: ArrowEntry[]) { const average = arrowAverage(arrows); return average === null ? "—" : average.toFixed(1); }
export function endTotal(arrows: ArrowEntry[], end: number) { return roundTotal(arrows.filter((item) => item.end === end)); }
export function xCount(arrows: ArrowEntry[]) { return arrows.filter((item) => item.score === "X").length; }
export function arrowKey(end: number, arrow: number) { return `${end}-${arrow}`; }
export function latestPlottedArrow(arrows: ArrowEntry[], preferredKey: string | null): ArrowEntry | null {
  const plotted = arrows.filter((item) => item.plot !== null);
  return plotted.find((item) => arrowKey(item.end, item.arrow) === preferredKey)
    ?? plotted.reduce<ArrowEntry | null>((latest, item) =>
      !latest || item.end > latest.end || item.end === latest.end && item.arrow > latest.arrow ? item : latest, null);
}
export function nextPlottedArrowSlot(arrows: ArrowEntry[], deleted: Pick<ArrowEntry,"end"|"arrow">): {end:number;arrow:number}|null {
  const after=arrows.filter((item)=>item.plot!==null&&(item.end>deleted.end||item.end===deleted.end&&item.arrow>deleted.arrow))
    .sort((a,b)=>a.end-b.end||a.arrow-b.arrow)[0];
  if (after) return {end:after.end,arrow:after.arrow};
  const before=arrows.filter((item)=>item.plot!==null&&(item.end<deleted.end||item.end===deleted.end&&item.arrow<deleted.arrow))
    .sort((a,b)=>b.end-a.end||b.arrow-a.arrow)[0];
  return before?{end:before.end,arrow:before.arrow}:null;
}
