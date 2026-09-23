import type { Division } from "../sessions/round-presets.ts";
import type { ArrowEntry, RoundDraft, SessionDraft, SessionType, TargetFaceType } from "../sessions/scoring-model.ts";

export type AnalyticsSessionType = SessionType | "all";
export type AnalyticsDateRange = "7" | "30" | "all";
export type VolumeInterval = "daily" | "weekly";
export type AnalyticsFilters = {
  sessionType: AnalyticsSessionType;
  dateRange: AnalyticsDateRange;
  distance: number | "all";
  division: Division | "all";
  targetFace: string | "all";
};
export type AnalyticsRound = {
  sessionId: string;
  sessionTitle: string;
  sessionType: SessionType;
  date: string;
  round: RoundDraft;
};
export type TrendPoint = {
  id: string;
  date: string;
  roundName: string;
  average: number;
  arrowCount: number;
};
export type DistancePerformance = {
  distance: number;
  average: number;
  arrowCount: number;
  roundCount: number;
};
export type BestRound = {
  id: string;
  name: string;
  date: string;
  average: number;
  total: number;
  arrowCount: number;
};
export type GroupingArrow = {
  id: string;
  x: number;
  y: number;
  faceIndex?: 0 | 1 | 2;
  score: ArrowEntry["score"];
};
export type TargetGrouping = {
  faceType: TargetFaceType;
  arrows: GroupingArrow[];
  missingPlotCount: number;
  unassignedTripleCount: number;
};
export type ArrowVolumePoint = {
  key: string;
  startDate: string;
  endDate: string;
  arrowCount: number;
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  sessionType: "training",
  dateRange: "30",
  distance: "all",
  division: "all",
  targetFace: "all",
};

export function targetFaceKey(round: Pick<RoundDraft, "faceDiameterCm" | "faceType">) {
  return `${round.faceDiameterCm}:${round.faceType}`;
}

export function targetFaceLabel(round: Pick<RoundDraft, "faceDiameterCm" | "faceType">) {
  const layout = round.faceType === "full_face" ? "full face" : round.faceType === "six_ring" ? "6-ring face" : "triple face";
  return `${round.faceDiameterCm} cm ${layout}`;
}

export function getAvailableFilters(sessions: SessionDraft[], filters: Pick<AnalyticsFilters, "sessionType" | "dateRange">, today: string) {
  const rounds = flattenRounds(sessions).filter((item) => matchesPrimaryFilters(item, filters, today));
  const distanceSet = new Set<number>();
  const divisionSet = new Set<Division>();
  const targetMap = new Map<string, string>();
  for (const item of rounds) {
    distanceSet.add(item.round.distanceMetres);
    divisionSet.add(item.round.division);
    targetMap.set(targetFaceKey(item.round), targetFaceLabel(item.round));
  }
  return {
    distances: [...distanceSet].sort((a, b) => a - b),
    divisions: [...divisionSet].sort(),
    targetFaces: [...targetMap].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export function filterAnalyticsRounds(sessions: SessionDraft[], filters: AnalyticsFilters, today: string) {
  return flattenRounds(sessions).filter((item) =>
    matchesPrimaryFilters(item, filters, today) &&
    (filters.distance === "all" || item.round.distanceMetres === filters.distance) &&
    (filters.division === "all" || item.round.division === filters.division) &&
    (filters.targetFace === "all" || targetFaceKey(item.round) === filters.targetFace),
  );
}

export function calculateOverview(rounds: AnalyticsRound[]) {
  const arrows = rounds.flatMap((item) => item.round.arrows);
  const total = totalPoints(arrows);
  const xCount = arrows.reduce((count, arrow) => count + Number(arrow.score === "X"), 0);
  const tenPlusXCount = arrows.reduce((count, arrow) => count + Number(scorePoints(arrow.score) === 10), 0);
  let bestRound: BestRound | null = null;
  for (const item of rounds) {
    const expectedArrows = item.round.ends * item.round.arrowsPerEnd;
    if (expectedArrows <= 0 || item.round.arrows.length !== expectedArrows) continue;
    const roundTotal = totalPoints(item.round.arrows);
    const candidate: BestRound = {
      id: item.round.id,
      name: item.round.name,
      date: item.date,
      average: roundTotal / item.round.arrows.length,
      total: roundTotal,
      arrowCount: item.round.arrows.length,
    };
    if (!bestRound || compareBestRound(candidate, bestRound) > 0) bestRound = candidate;
  }
  return {
    totalArrows: arrows.length,
    averagePerArrow: arrows.length === 0 ? null : total / arrows.length,
    xCount,
    xPercentage: arrows.length === 0 ? null : xCount / arrows.length * 100,
    tenPlusXPercentage: arrows.length === 0 ? null : tenPlusXCount / arrows.length * 100,
    bestRound,
  };
}

export function calculateTrend(rounds: AnalyticsRound[]): TrendPoint[] {
  return rounds.flatMap((item) => {
    if (item.round.arrows.length === 0) return [];
    return [{
      id: item.round.id,
      date: item.date,
      roundName: item.round.name,
      average: totalPoints(item.round.arrows) / item.round.arrows.length,
      arrowCount: item.round.arrows.length,
    }];
  }).sort((a, b) => a.date.localeCompare(b.date) || a.roundName.localeCompare(b.roundName));
}

export function calculateDistancePerformance(rounds: AnalyticsRound[]): DistancePerformance[] {
  const groups = new Map<number, { total: number; arrowCount: number; roundIds: Set<string> }>();
  for (const item of rounds) {
    if (item.round.arrows.length === 0) continue;
    const group = groups.get(item.round.distanceMetres) ?? { total: 0, arrowCount: 0, roundIds: new Set<string>() };
    group.total += totalPoints(item.round.arrows);
    group.arrowCount += item.round.arrows.length;
    group.roundIds.add(item.round.id);
    groups.set(item.round.distanceMetres, group);
  }
  return [...groups].map(([distance, group]) => ({
    distance,
    average: group.total / group.arrowCount,
    arrowCount: group.arrowCount,
    roundCount: group.roundIds.size,
  })).sort((a, b) => a.distance - b.distance);
}

export function calculateTargetGroupings(rounds: AnalyticsRound[]): TargetGrouping[] {
  const groups = new Map<TargetFaceType, TargetGrouping>();
  for (const item of rounds) {
    const faceType = item.round.faceType;
    const group = groups.get(faceType) ?? { faceType, arrows: [], missingPlotCount: 0, unassignedTripleCount: 0 };
    for (const arrow of item.round.arrows) {
      if (!arrow.plot) {
        group.missingPlotCount += 1;
        continue;
      }
      if (faceType === "triple_face" && arrow.plot.faceIndex === undefined) {
        group.unassignedTripleCount += 1;
        continue;
      }
      group.arrows.push({ id: arrow.id, x: arrow.plot.x, y: arrow.plot.y, faceIndex: arrow.plot.faceIndex, score: arrow.score });
    }
    groups.set(faceType, group);
  }
  return (["full_face", "six_ring", "triple_face"] as TargetFaceType[]).flatMap((faceType) => {
    const group = groups.get(faceType);
    return group ? [group] : [];
  });
}

export function calculateArrowVolume(
  sessions: SessionDraft[],
  filters: Pick<AnalyticsFilters, "sessionType" | "dateRange">,
  today: string,
  interval: VolumeInterval,
): ArrowVolumePoint[] {
  const groups = new Map<string, ArrowVolumePoint>();
  for (const session of sessions) {
    if (!matchesSessionPrimaryFilters(session, filters, today)) continue;
    const arrowCount = session.arrowCount;
    if (arrowCount === 0) continue;
    const startDate = interval === "daily" ? session.date : startOfWeek(session.date);
    const endDate = interval === "daily" ? session.date : shiftDate(startDate, 6);
    const current = groups.get(startDate);
    if (current) current.arrowCount += arrowCount;
    else groups.set(startDate, { key: startDate, startDate, endDate, arrowCount });
  }
  return [...groups.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function formatAnalyticsDate(value: string, includeYear = true) {
  const { day, month, year } = dateParts(value);
  const formatted = `${day} ${shortMonthNames[month - 1]}`;
  return includeYear ? `${formatted} ${year}` : formatted;
}

export function formatAnalyticsWeekRange(startDate: string, endDate: string) {
  const start = dateParts(startDate);
  const end = dateParts(endDate);
  if (start.month === end.month && start.year === end.year) return `${start.day}–${end.day} ${shortMonthNames[end.month - 1]}`;
  return `${formatAnalyticsDate(startDate, false)}–${formatAnalyticsDate(endDate, false)}`;
}

function flattenRounds(sessions: SessionDraft[]): AnalyticsRound[] {
  return sessions.flatMap((session) => session.rounds.map((round) => ({
    sessionId: session.id,
    sessionTitle: session.title,
    sessionType: session.sessionType,
    date: session.date,
    round,
  })));
}

function matchesPrimaryFilters(item: AnalyticsRound, filters: Pick<AnalyticsFilters, "sessionType" | "dateRange">, today: string) {
  return matchesSessionPrimaryFilters(item, filters, today);
}

function matchesSessionPrimaryFilters(session: Pick<SessionDraft, "sessionType" | "date">, filters: Pick<AnalyticsFilters, "sessionType" | "dateRange">, today: string) {
  if (filters.sessionType !== "all" && session.sessionType !== filters.sessionType) return false;
  if (filters.dateRange === "all") return true;
  const days = filters.dateRange === "7" ? 6 : 29;
  const cutoff = shiftDate(today, -days);
  return session.date >= cutoff && session.date <= today;
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const daysAfterMonday = (date.getUTCDay() + 6) % 7;
  return shiftDate(value, -daysAfterMonday);
}

function totalPoints(arrows: ArrowEntry[]) {
  return arrows.reduce((total, arrow) => total + scorePoints(arrow.score), 0);
}

function scorePoints(score: ArrowEntry["score"]) {
  return score === "X" ? 10 : score === "M" ? 0 : Number(score);
}

function compareBestRound(a: BestRound, b: BestRound) {
  return a.average - b.average || a.arrowCount - b.arrowCount || a.total - b.total || a.date.localeCompare(b.date);
}
