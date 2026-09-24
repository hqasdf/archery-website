import { calculateArrowVolume, calculateOverview } from "../analytics/analytics-model.ts";
import { calculateGroupingMetrics } from "../sessions/session-insights-model.ts";
import { arrowAverage, roundTotal, xCount, type RoundDraft, type SessionDraft } from "../sessions/scoring-model.ts";

export type CoachAthlete = {
  userId: string;
  displayName: string | null;
  joinedAt: string;
};

export function singaporeToday(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function athleteName(athlete: CoachAthlete) {
  return athlete.displayName?.trim() || `Archer ${athlete.userId.slice(0, 8)}`;
}

export function thisWeek(sessions: SessionDraft[], today: string) {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const monday = start.toISOString().slice(0, 10);
  const current = sessions.filter((session) => session.date >= monday && session.date <= today);
  return { sessionCount: current.length, arrowCount: current.reduce((sum, session) => sum + session.arrowCount, 0) };
}

export function latestCompletedRound(sessions: SessionDraft[]) {
  return completedRounds(sessions)[0] ?? null;
}

export function completedRounds(sessions: SessionDraft[]) {
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date)).flatMap((session) =>
    [...session.rounds].sort((a, b) => b.roundNumber - a.roundNumber)
      .filter((round) => round.ends * round.arrowsPerEnd > 0 && round.arrows.length === round.ends * round.arrowsPerEnd)
      .map((round) => ({ session, round })));
}

export function roundSummary(round: RoundDraft) {
  return { total: roundTotal(round.arrows), average: arrowAverage(round.arrows), xCount: xCount(round.arrows) };
}

export function athleteAnalytics(sessions: SessionDraft[], today: string) {
  const rounds = sessions.flatMap((session) => session.rounds.map((round) => ({
    sessionId: session.id, sessionTitle: session.title, sessionType: session.sessionType,
    date: session.date, round,
  })));
  const overview = calculateOverview(rounds);
  const volume = calculateArrowVolume(sessions, { sessionType: "all", dateRange: "all" }, today, "daily");
  const latest = latestCompletedRound(sessions);
  const plotted = latest?.round.arrows.flatMap((arrow) => arrow.plot &&
    (latest.round.faceType !== "triple_face" || arrow.plot.faceIndex !== undefined)
    ? [{ x: arrow.plot.x, y: arrow.plot.y }] : []) ?? [];
  const grouping = latest ? calculateGroupingMetrics(plotted, latest.round.faceDiameterCm) : null;
  return { overview, volume, latest, grouping };
}
