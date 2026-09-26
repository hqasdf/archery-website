import {
  arrowKey, latestPlottedArrow, nextPlottedArrowSlot, scoreFromPlot,
  type ArrowEntry, type Plot, type RoundDraft, type ScoreLabel,
} from "@arc-track/core/scoring";

export type ArrowSlot = { end: number; arrow: number };

export function firstEmptySlot(round: RoundDraft, arrows: ArrowEntry[]): ArrowSlot {
  for (let end = 1; end <= round.ends; end++) {
    for (let arrow = 1; arrow <= round.arrowsPerEnd; arrow++) {
      if (!arrows.some((item) => item.end === end && item.arrow === arrow)) return { end, arrow };
    }
  }
  return { end: round.ends, arrow: round.arrowsPerEnd };
}

export function nextEmptySlot(round: RoundDraft, arrows: ArrowEntry[], current: ArrowSlot): ArrowSlot {
  const total = round.ends * round.arrowsPerEnd;
  const index = (current.end - 1) * round.arrowsPerEnd + current.arrow - 1;
  for (let offset = 1; offset <= total; offset++) {
    const next = (index + offset) % total;
    const slot = { end: Math.floor(next / round.arrowsPerEnd) + 1, arrow: next % round.arrowsPerEnd + 1 };
    if (!arrows.some((item) => item.end === slot.end && item.arrow === slot.arrow)) return slot;
  }
  return current;
}

export function plotCurrentArrow(round: RoundDraft, arrows: ArrowEntry[], slot: ArrowSlot, plot: Plot) {
  const existing = arrows.find((item) => item.end === slot.end && item.arrow === slot.arrow);
  const entry: ArrowEntry = existing
    ? { ...existing, score: scoreFromPlot(plot, round.faceType), plot, syncState: "saving" }
    : { id: arrowKey(slot.end, slot.arrow), ...slot, score: scoreFromPlot(plot, round.faceType), plot, syncState: "saving" };
  const updated = existing
    ? arrows.map((item) => item === existing ? entry : item)
    : [...arrows, entry];
  return { arrows: updated, entry, isNew: !existing, slot: existing ? slot : nextEmptySlot(round, updated, slot) };
}

export function correctArrowScore(entry: ArrowEntry, score: ScoreLabel): ArrowEntry {
  return { ...entry, score, syncState: "saving" };
}

export function clearArrowPlot(entry: ArrowEntry): ArrowEntry {
  return { ...entry, plot: null, syncState: "saving" };
}

export function deleteSelectedArrow(round: RoundDraft, arrows: ArrowEntry[], removed: ArrowEntry) {
  const remaining = arrows.filter((item) => item.end !== removed.end || item.arrow !== removed.arrow);
  return {
    arrows: remaining,
    slot: nextPlottedArrowSlot(remaining, removed) ?? firstEmptySlot(round, remaining),
  };
}

export function previousPlottedArrow(arrows: ArrowEntry[], slot: ArrowSlot): ArrowEntry | null {
  const currentIsPlotted = arrows.some((entry) => entry.end === slot.end && entry.arrow === slot.arrow && entry.plot !== null);
  return arrows.filter((entry) => entry.plot !== null && (
    entry.end < slot.end || (entry.end === slot.end && (currentIsPlotted ? entry.arrow <= slot.arrow : entry.arrow < slot.arrow))
  )).sort((a, b) => b.end - a.end || b.arrow - a.arrow)[0] ?? null;
}

export function restoreDeletedArrow(arrows: ArrowEntry[], removed: ArrowEntry) {
  if (arrows.some((item) => item.end === removed.end && item.arrow === removed.arrow)) return arrows;
  return [...arrows, removed].sort((a, b) => a.end - b.end || a.arrow - b.arrow);
}

export function applyArrowSaveResult(
  arrows: ArrowEntry[], key: string, requestVersion: number, currentVersion: number,
  result: { id: string } | { failed: true },
) {
  if (requestVersion !== currentVersion) return arrows;
  return arrows.map((item) => {
    if (arrowKey(item.end, item.arrow) !== key) return item;
    return "id" in result
      ? { ...item, id: result.id, syncState: "saved" as const }
      : { ...item, syncState: "failed" as const };
  });
}

export function latestScore(arrows: ArrowEntry[], latestPlotKey: string | null) {
  return latestPlottedArrow(arrows, latestPlotKey)?.score ?? null;
}
