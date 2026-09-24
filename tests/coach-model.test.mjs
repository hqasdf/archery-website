import assert from "node:assert/strict";
import test from "node:test";
import { athleteAnalytics, latestCompletedRound, singaporeToday, thisWeek } from "../src/features/organizations/coach-model.ts";

const round = (id, arrows) => ({
  id, roundNumber: 1, name: id, division: "Recurve", distanceMetres: 70,
  ends: 1, arrowsPerEnd: 2, faceDiameterCm: 122, faceType: "full_face", arrows,
});
const arrow = (id, score, x) => ({ id, end: 1, arrow: Number(id.at(-1)), score, plot: { x, y: 0 } });
const session = (id, date, arrowCount, rounds) => ({
  id, title: id, date, sessionType: "training", arrowCount, rounds,
});

test("coach week uses organisation Session arrow counts and Monday boundary", () => {
  const sessions = [
    session("sunday", "2026-09-20", 80, []),
    session("monday", "2026-09-21", 120, []),
    session("thursday", "2026-09-24", 60, []),
  ];
  assert.deepEqual(thisWeek(sessions, "2026-09-24"), { sessionCount: 2, arrowCount: 180 });
});

test("coach insights reuse saved score metrics and ignore incomplete latest Round", () => {
  const sessions = [
    session("new", "2026-09-24", 200, [round("incomplete", [arrow("a1", "X", 0.1)])]),
    session("old", "2026-09-22", 72, [round("complete", [arrow("b1", "X", 0.1), arrow("b2", "9", 0.2)])]),
  ];
  assert.equal(latestCompletedRound(sessions)?.round.id, "complete");
  const result = athleteAnalytics(sessions, "2026-09-24");
  assert.equal(result.overview.totalArrows, 3);
  assert.equal(result.overview.xCount, 2);
  assert.equal(result.overview.bestRound?.total, 19);
  assert.deepEqual(result.volume.map((point) => point.arrowCount), [72, 200]);
});

test("empty and unscored coach data keep unavailable averages distinct from known zero counts", () => {
  assert.deepEqual(thisWeek([], "2026-09-24"), { sessionCount: 0, arrowCount: 0 });
  const empty = athleteAnalytics([], "2026-09-24");
  assert.equal(empty.overview.totalArrows, 0);
  assert.equal(empty.overview.averagePerArrow, null);
  assert.equal(empty.overview.xPercentage, null);
  assert.equal(latestCompletedRound([]), null);

  const unscored = [session("practice", "2026-09-24", 0, [])];
  assert.deepEqual(thisWeek(unscored, "2026-09-24"), { sessionCount: 1, arrowCount: 0 });
  assert.equal(athleteAnalytics(unscored, "2026-09-24").overview.totalArrows, 0);
});

test("scored coach data can have a genuine zero X count", () => {
  const sessions = [session("practice", "2026-09-24", 2, [
    round("complete", [arrow("a1", "9", 0.1), arrow("a2", "8", 0.2)]),
  ])];
  const { overview } = athleteAnalytics(sessions, "2026-09-24");
  assert.equal(overview.totalArrows, 2);
  assert.equal(overview.xCount, 0);
  assert.equal(overview.xPercentage, 0);
});

test("Singapore date remains ISO date-only", () => {
  assert.equal(singaporeToday(new Date("2026-09-23T18:00:00Z")), "2026-09-24");
});
