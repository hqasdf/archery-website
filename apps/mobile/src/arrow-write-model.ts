import { points, type ArrowEntry } from "@arc-track/core/scoring";

export function arrowWriteFields(entry: ArrowEntry) {
  return {
    score_points: points(entry.score),
    is_x: entry.score === "X",
    plot_x: entry.plot?.x ?? null,
    plot_y: entry.plot?.y ?? null,
    face_index: entry.plot?.faceIndex ?? null,
  };
}
