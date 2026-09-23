import { roundTotal, type ArrowEntry, type RoundDraft } from "./scoring-model.ts";

export type EndPoint = {
  endNumber: number;
  total: number;
  average: number | null;
  arrowCount: number;
  expectedArrowCount: number;
  complete: boolean;
};

export type EndAnalysis = {
  ends: EndPoint[];
  completedEndCount: number;
  average: number | null;
  best: EndPoint | null;
  worst: EndPoint | null;
  consistency: number | null;
  trendSlope: number | null;
};

export type GroupingPoint = {
  id: string;
  x: number;
  y: number;
  faceIndex?: 0 | 1 | 2;
  score: ArrowEntry["score"];
};

export type GroupingMetrics = {
  centreX: number;
  centreY: number;
  arrowCount: number;
  groupSizeNormalized: number | null;
  spreadNormalized: number | null;
  groupSizeCm: number | null;
  spreadCm: number | null;
};

export type RoundGroupingInsights = {
  arrows: GroupingPoint[];
  missingPlotCount: number;
  unassignedTripleCount: number;
  metrics: GroupingMetrics | null;
};

export function calculateEndAnalysis(round: RoundDraft): EndAnalysis {
  const ends = Array.from({ length: round.ends }, (_, index) => {
    const endNumber = index + 1;
    const arrows = round.arrows.filter((arrow) => arrow.end === endNumber);
    const total = roundTotal(arrows);
    return {
      endNumber,
      total,
      average: arrows.length ? total / arrows.length : null,
      arrowCount: arrows.length,
      expectedArrowCount: round.arrowsPerEnd,
      complete: arrows.length === round.arrowsPerEnd,
    };
  });
  const completed = ends.filter((end) => end.complete && end.average !== null);
  const average = completed.length ? completed.reduce((sum, end) => sum + end.average!, 0) / completed.length : null;
  const best = completed.reduce<EndPoint | null>((current, end) => !current || end.average! > current.average! ? end : current, null);
  const worst = completed.reduce<EndPoint | null>((current, end) => !current || end.average! < current.average! ? end : current, null);
  const consistency = completed.length < 2 || average === null
    ? null
    : Math.sqrt(completed.reduce((sum, end) => sum + (end.average! - average) ** 2, 0) / completed.length);
  const trendSlope = completed.length < 2
    ? null
    : regressionSlope(completed.map((end) => ({ x: end.endNumber, y: end.average! })));
  return { ends, completedEndCount: completed.length, average, best, worst, consistency, trendSlope };
}

export function calculateGroupingMetrics(
  arrows: Pick<GroupingPoint, "x" | "y">[],
  faceDiameterCm?: number,
): GroupingMetrics | null {
  if (arrows.length === 0) return null;
  const centreX = arrows.reduce((sum, arrow) => sum + arrow.x, 0) / arrows.length;
  const centreY = arrows.reduce((sum, arrow) => sum + arrow.y, 0) / arrows.length;
  const enoughArrows = arrows.length >= 3;
  const spreadNormalized = enoughArrows
    ? Math.sqrt(arrows.reduce((sum, arrow) => sum + (arrow.x - centreX) ** 2 + (arrow.y - centreY) ** 2, 0) / arrows.length)
    : null;
  const groupSizeNormalized = enoughArrows ? maximumPairwiseDistance(arrows) : null;
  const faceRadiusCm = faceDiameterCm === undefined ? null : faceDiameterCm / 2;
  return {
    centreX,
    centreY,
    arrowCount: arrows.length,
    groupSizeNormalized,
    spreadNormalized,
    groupSizeCm: groupSizeNormalized === null || faceRadiusCm === null ? null : groupSizeNormalized * faceRadiusCm,
    spreadCm: spreadNormalized === null || faceRadiusCm === null ? null : spreadNormalized * faceRadiusCm,
  };
}

export function calculateRoundGroupingInsights(round: RoundDraft): RoundGroupingInsights {
  const arrows: GroupingPoint[] = [];
  let missingPlotCount = 0;
  let unassignedTripleCount = 0;
  for (const arrow of round.arrows) {
    if (!arrow.plot) {
      missingPlotCount += 1;
      continue;
    }
    if (round.faceType === "triple_face" && arrow.plot.faceIndex === undefined) {
      unassignedTripleCount += 1;
      continue;
    }
    arrows.push({ id: arrow.id, x: arrow.plot.x, y: arrow.plot.y, faceIndex: arrow.plot.faceIndex, score: arrow.score });
  }
  return {
    arrows,
    missingPlotCount,
    unassignedTripleCount,
    metrics: calculateGroupingMetrics(arrows, round.faceDiameterCm),
  };
}

function maximumPairwiseDistance(arrows: Pick<GroupingPoint, "x" | "y">[]) {
  let maximum = 0;
  for (let first = 0; first < arrows.length; first += 1) {
    for (let second = first + 1; second < arrows.length; second += 1) {
      maximum = Math.max(maximum, Math.hypot(arrows[second].x - arrows[first].x, arrows[second].y - arrows[first].y));
    }
  }
  return maximum;
}

function regressionSlope(points: { x: number; y: number }[]) {
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  return denominator === 0 ? 0 : points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator;
}
