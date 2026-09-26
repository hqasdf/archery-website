import test from "node:test";
import assert from "node:assert/strict";
import { mobileAnalyticsView, mobileRoundInsights, singaporeToday, DEFAULT_ANALYTICS_FILTERS } from "../src/mobile-analytics.ts";

const arrow = (id, end, arrowNumber, score, x, y, faceIndex) => ({
  id, end, arrow: arrowNumber, score,
  plot: x === null ? null : { x, y, ...(faceIndex === undefined ? {} : { faceIndex }) },
});
const complete = {
  id: "complete", roundNumber: 1, name: "70 m", division: "Recurve", distanceMetres: 70,
  ends: 2, arrowsPerEnd: 2, faceDiameterCm: 122, faceType: "full_face",
  arrows: [arrow("a1", 1, 1, "X", 0, 0), arrow("a2", 1, 2, "10", .08, 0), arrow("a3", 2, 1, "9", .15, 0), arrow("a4", 2, 2, "8", .25, 0)],
};
const partial = {
  ...complete, id: "partial", name: "18 m", distanceMetres: 18, faceDiameterCm: 40,
  arrows: [arrow("p1", 1, 1, "X", .02, .01)],
};
const sessions = [
  { id: "s1", title: "Training", date: "2026-09-26", sessionType: "training", arrowCount: 100, rounds: [complete, partial] },
  { id: "s2", title: "Competition", date: "2026-09-01", sessionType: "competition", arrowCount: 72, rounds: [{ ...complete, id: "competition", arrows: [arrow("c1", 1, 1, "9", .15, 0)] }] },
  { id: "s3", title: "Old", date: "2026-08-01", sessionType: "training", arrowCount: 30, rounds: [{ ...partial, id: "old" }] },
];
const today = "2026-09-26";
const view = (filters = DEFAULT_ANALYTICS_FILTERS, source = sessions) => mobileAnalyticsView(source, filters, today, "daily");

test("mobile adapter uses core filters for Training, Competition, All, date and distance", () => {
  assert.equal(view().rounds.length, 2);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, sessionType: "competition", dateRange: "all" }).rounds.length, 1);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, sessionType: "all", dateRange: "all" }).rounds.length, 4);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, dateRange: "7" }).rounds.length, 2);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, dateRange: "30" }).rounds.length, 2);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, dateRange: "all", distance: 18 }).rounds.length, 2);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, targetFace: "122:full_face" }).rounds.length, 1);
  assert.equal(view({ ...DEFAULT_ANALYTICS_FILTERS, dateRange: "30", division: "Compound" }).rounds.length, 0);
  assert.deepEqual(view().available.distances, [18, 70]);
});

test("empty and filtered-out data produce safe empty analytics inputs", () => {
  const empty = view(DEFAULT_ANALYTICS_FILTERS, []);
  assert.equal(empty.overview.totalArrows, 0);
  assert.equal(empty.overview.averagePerArrow, null);
  assert.equal(empty.overview.bestRound, null);
  assert.deepEqual(empty.trend, []);
  assert.deepEqual(empty.groupings, []);
  const noMatch = view({ ...DEFAULT_ANALYTICS_FILTERS, division: "Compound" });
  assert.equal(noMatch.overview.totalArrows, 0);
});

test("overview, best completed Round and normalized trend match shared core", () => {
  const result = view();
  assert.equal(result.overview.totalArrows, 5);
  assert.equal(result.overview.averagePerArrow, 47 / 5);
  assert.equal(result.overview.xCount, 2);
  assert.equal(result.overview.tenPlusXPercentage, 60);
  assert.equal(result.overview.bestRound?.id, "complete");
  assert.equal(result.trend.find((point) => point.id === "complete")?.average, 37 / 4);
  assert.equal(result.distances.find((item) => item.distance === 70)?.arrowCount, 4);
  assert.equal(result.groupings.find((item) => item.faceType === "full_face")?.arrows.length, 5);
  assert.equal(result.volume[0].arrowCount, 100);
});

test("Round Insights maps completion, Ends, grouping and supported possible flyers", () => {
  const result = mobileRoundInsights(complete);
  assert.equal(result.total, 37);
  assert.equal(result.complete, true);
  assert.equal(result.arrowCount, 4);
  assert.equal(result.average, 37 / 4);
  assert.equal(result.overview.xCount, 1);
  assert.equal(result.tenPlusXCount, 2);
  assert.equal(result.grouping.arrows.length, 4);
  assert.equal(result.grouping.metrics?.arrowCount, 4);
  assert.equal(result.ends.completedEndCount, 2);
  assert.equal(mobileRoundInsights(partial).complete, false);
  assert.equal(mobileRoundInsights(partial).ends.completedEndCount, 0);
  const triple = { ...complete, faceType: "triple_face", arrows: [arrow("t1", 1, 1, "9", .15, 0, 2)] };
  assert.equal(mobileRoundInsights(triple).grouping.arrows[0].faceIndex, 2);
});

test("refreshed persisted hierarchy recalculates without cached analytics totals", () => {
  const before = view();
  const updated = [{ ...sessions[0], rounds: [{ ...complete, arrows: [...complete.arrows, arrow("new", 2, 3, "9", .2, 0)] }, partial] }, ...sessions.slice(1)];
  const after = view(DEFAULT_ANALYTICS_FILTERS, updated);
  assert.equal(after.overview.totalArrows, before.overview.totalArrows + 1);
  assert.equal(singaporeToday(new Date("2026-09-25T17:00:00Z")), "2026-09-26");
});
