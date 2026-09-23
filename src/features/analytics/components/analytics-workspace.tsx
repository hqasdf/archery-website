"use client";

import { useMemo, useState } from "react";
import type { SessionDraft } from "@/features/sessions/scoring-model";
import { calculateArrowVolume, calculateDistancePerformance, calculateOverview, calculateTargetGroupings, calculateTrend, DEFAULT_ANALYTICS_FILTERS, filterAnalyticsRounds, formatAnalyticsDate, formatAnalyticsWeekRange, getAvailableFilters, type AnalyticsDateRange, type AnalyticsFilters, type AnalyticsSessionType, type ArrowVolumePoint, type TrendPoint, type VolumeInterval } from "../analytics-model";
import { AnalyticsTargetGrouping } from "./analytics-target-grouping";
import styles from "./analytics.module.css";

const sessionTypes: { value: AnalyticsSessionType; label: string }[] = [{ value: "training", label: "Training" }, { value: "competition", label: "Competition" }, { value: "all", label: "All" }];
const dateRanges: { value: AnalyticsDateRange; label: string }[] = [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "all", label: "All time" }];

export function AnalyticsWorkspace({ sessions, today }: { sessions: SessionDraft[]; today: string }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [volumeInterval, setVolumeInterval] = useState<VolumeInterval>("daily");
  const available = useMemo(() => getAvailableFilters(sessions, filters, today), [sessions, filters, today]);
  const rounds = useMemo(() => filterAnalyticsRounds(sessions, filters, today), [sessions, filters, today]);
  const overview = useMemo(() => calculateOverview(rounds), [rounds]);
  const trend = useMemo(() => calculateTrend(rounds), [rounds]);
  const distances = useMemo(() => calculateDistancePerformance(rounds), [rounds]);
  const groupings = useMemo(() => calculateTargetGroupings(rounds), [rounds]);
  const volume = useMemo(() => calculateArrowVolume(sessions, filters, today, volumeInterval), [sessions, filters, today, volumeInterval]);

  function setPrimaryFilter(update: Partial<Pick<AnalyticsFilters, "sessionType" | "dateRange">>) {
    setFilters((current) => ({ ...current, ...update, distance: "all", division: "all", targetFace: "all" }));
  }

  return <div className={styles.analytics}>
    <section className={styles.filters} aria-labelledby="analytics-filters-heading">
      <div className={styles.filterHeading}><div><p className={styles.kicker}>View</p><h2 id="analytics-filters-heading">Analytics filters</h2></div><p>{rounds.length} {rounds.length === 1 ? "Round" : "Rounds"} in this view</p></div>
      <FilterButtons label="Session type" options={sessionTypes} value={filters.sessionType} onChange={(sessionType) => setPrimaryFilter({ sessionType })}/>
      <FilterButtons label="Date range" options={dateRanges} value={filters.dateRange} onChange={(dateRange) => setPrimaryFilter({ dateRange })}/>
      <div className={styles.secondaryFilters}>
        <label><span>Distance</span><select value={filters.distance} onChange={(event) => setFilters((current) => ({ ...current, distance: event.target.value === "all" ? "all" : Number(event.target.value) }))}><option value="all">All distances</option>{available.distances.map((distance) => <option key={distance} value={distance}>{distance} m</option>)}</select></label>
        <label><span>Division</span><select value={filters.division} onChange={(event) => setFilters((current) => ({ ...current, division: event.target.value as AnalyticsFilters["division"] }))}><option value="all">All divisions</option>{available.divisions.map((division) => <option key={division} value={division}>{division}</option>)}</select></label>
        <label><span>Target face</span><select value={filters.targetFace} onChange={(event) => setFilters((current) => ({ ...current, targetFace: event.target.value }))}><option value="all">All target faces</option>{available.targetFaces.map((face) => <option key={face.value} value={face.value}>{face.label}</option>)}</select></label>
      </div>
    </section>

    <section aria-labelledby="overview-heading"><SectionHeading eyebrow="Saved performance" heading="Overview" id="overview-heading"/>
      <div className={styles.metricGrid}>
        <Metric label="Total saved Arrows" value={String(overview.totalArrows)}/>
        <Metric label="Average / Arrow" value={formatAverage(overview.averagePerArrow)}/>
        <Metric label="X count" value={String(overview.xCount)}/>
        <Metric label="X percentage" value={formatPercentage(overview.xPercentage)}/>
        <Metric label="10 + X percentage" value={formatPercentage(overview.tenPlusXPercentage)}/>
      </div>
      <div className={styles.bestRound}>
        <div><p className={styles.kicker}>Best completed Round</p>{overview.bestRound ? <><h3>{overview.bestRound.name}</h3><p>{formatAnalyticsDate(overview.bestRound.date)}</p></> : <><h3>No completed Round in this view</h3><p>A Round qualifies after every planned Arrow has been saved.</p></>}</div>
        {overview.bestRound ? <div className={styles.bestRoundStats}><span><strong>{overview.bestRound.average.toFixed(2)}</strong> avg / Arrow</span><span><strong>{overview.bestRound.total}</strong> total score</span><span><strong>{overview.bestRound.arrowCount}</strong> Arrows</span></div> : null}
      </div>
    </section>

    <section aria-labelledby="trend-heading"><SectionHeading eyebrow="Normalized comparison" heading="Performance trend" id="trend-heading"/><div className={styles.panel}>{trend.length === 0 ? <EmptyState title="No scored Rounds in this view" body="Change the filters or score a Round to build your trend."/> : <><TrendChart points={trend}/><div className={styles.trendList}>{trend.map((point) => <div key={point.id}><span>{formatAnalyticsDate(point.date)} · {point.roundName}</span><strong>{point.average.toFixed(2)} avg · {point.arrowCount} {point.arrowCount === 1 ? "Arrow" : "Arrows"}</strong></div>)}</div></>}</div></section>

    <section aria-labelledby="distance-heading"><SectionHeading eyebrow="Comparable context" heading="Performance by distance" id="distance-heading"/><div className={styles.panel}>{distances.length === 0 ? <EmptyState title="No distance results yet" body="Saved scored Arrows will be grouped by Round distance."/> : <div className={styles.distanceList}>{distances.map((item) => <div key={item.distance}><strong>{item.distance} m</strong><span>Avg / Arrow: <b>{item.average.toFixed(2)}</b></span><small>{item.arrowCount} {item.arrowCount === 1 ? "Arrow" : "Arrows"} · {item.roundCount} {item.roundCount === 1 ? "Round" : "Rounds"}</small></div>)}</div>}</div></section>

    <section aria-labelledby="grouping-heading"><SectionHeading eyebrow="Saved coordinates" heading="Target grouping" id="grouping-heading"/><div className={styles.panel}><AnalyticsTargetGrouping groups={groupings}/></div></section>

    <section className={styles.volumeSection} aria-labelledby="volume-heading">
      <div className={styles.volumeHeading}><SectionHeading eyebrow="Session-level activity" heading="Arrow volume" id="volume-heading"/><div className={styles.volumeToggle} role="group" aria-label="Arrow count interval"><button type="button" aria-pressed={volumeInterval === "daily"} onClick={() => setVolumeInterval("daily")}>Daily</button><button type="button" aria-pressed={volumeInterval === "weekly"} onClick={() => setVolumeInterval("weekly")}>Weekly</button></div></div>
      <div className={styles.panel}>{volume.length === 0 ? <EmptyState title="No Session Arrow volume in this view" body="The chart will appear after matching Sessions have an Arrow count."/> : <VolumeChart points={volume} interval={volumeInterval}/>}</div>
    </section>
  </div>;
}

function FilterButtons<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <fieldset className={styles.segmented}><legend>{label}</legend><div>{options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div></fieldset>;
}
function SectionHeading({ eyebrow, heading, id }: { eyebrow: string; heading: string; id: string }) { return <div className={styles.sectionHeading}><p className={styles.kicker}>{eyebrow}</p><h2 id={id}>{heading}</h2></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <article className={styles.metric}><span>{label}</span><strong>{value}</strong></article>; }
function EmptyState({ title, body }: { title: string; body: string }) { return <div className={styles.emptyState}><h3>{title}</h3><p>{body}</p></div>; }
function formatAverage(value: number | null) { return value === null ? "—" : value.toFixed(2); }
function formatPercentage(value: number | null) { return value === null ? "—" : `${value.toFixed(1)}%`; }
function TrendChart({ points }: { points: TrendPoint[] }) {
  const left = 54, right = 774, top = 18, bottom = 210;
  const x = (index: number) => points.length === 1 ? (left + right) / 2 : left + index / (points.length - 1) * (right - left);
  const y = (average: number) => bottom - average / 10 * (bottom - top);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.average).toFixed(1)}`).join(" ");
  return <div className={styles.chartWrap}><svg viewBox="0 0 800 244" role="img" aria-label="Average score per Arrow by Round over time">
    {[0, 2, 4, 6, 8, 10].map((value) => <g key={value}><line x1={left} x2={right} y1={y(value)} y2={y(value)} className={styles.gridLine}/><text x="43" y={y(value) + 4} textAnchor="end" className={styles.axisLabel}>{value}</text></g>)}
    <path d={path} className={styles.trendLine}/>
    {points.map((point, index) => <circle key={point.id} cx={x(index)} cy={y(point.average)} r="5" className={styles.trendPoint}/>)}
  </svg></div>;
}

function VolumeChart({ points, interval }: { points: ArrowVolumePoint[]; interval: VolumeInterval }) {
  const width = Math.max(560, points.length * 76 + 80), left = 52, right = width - 20, top = 18, bottom = 196;
  const maximum = Math.max(...points.map((point) => point.arrowCount));
  const x = (index: number) => left + (index + .5) / points.length * (right - left);
  const y = (value: number) => bottom - value / maximum * (bottom - top);
  const slotWidth = (right - left) / points.length;
  const barWidth = Math.min(48, Math.max(18, slotWidth * .58));
  return <><div className={styles.volumeChart}><svg viewBox={`0 0 ${width} 238`} style={{ minWidth: `${width}px` }} role="img" aria-label={`${interval === "daily" ? "Daily" : "Weekly"} Session Arrow volume`}>
    {[0, .25, .5, .75, 1].map((ratio) => { const value = Math.round(maximum * ratio); return <g key={ratio}><line x1={left} x2={right} y1={y(maximum * ratio)} y2={y(maximum * ratio)} className={styles.gridLine}/><text x="43" y={y(maximum * ratio) + 4} textAnchor="end" className={styles.axisLabel}>{value}</text></g>; })}
    {points.map((point, index) => { const barTop = y(point.arrowCount); return <g key={point.key}><rect x={x(index) - barWidth / 2} y={barTop} width={barWidth} height={bottom - barTop} rx="5" className={styles.volumeBar}/><text x={x(index)} y={barTop - 7} textAnchor="middle" className={styles.barValue}>{point.arrowCount}</text><text x={x(index)} y="218" textAnchor="middle" className={styles.axisLabel}>{formatVolumeAxisLabel(point, interval)}</text></g>; })}
  </svg></div><div className={styles.volumeList}>{points.map((point) => <div key={point.key}><span>{formatVolumeRange(point, interval)}</span><strong>{point.arrowCount} {point.arrowCount === 1 ? "Arrow" : "Arrows"}</strong></div>)}</div></>;
}

function formatVolumeAxisLabel(point: ArrowVolumePoint, interval: VolumeInterval) {
  return interval === "daily" ? formatAnalyticsDate(point.startDate, false) : formatAnalyticsWeekRange(point.startDate, point.endDate);
}
function formatVolumeRange(point: ArrowVolumePoint, interval: VolumeInterval) {
  return interval === "daily" ? formatAnalyticsDate(point.startDate) : formatAnalyticsWeekRange(point.startDate, point.endDate);
}
