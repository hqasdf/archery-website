"use client";

import { useMemo } from "react";
import type { SessionDraft } from "@/features/sessions/scoring-model";
import { calculateTrainingCompetitionComparison, filterComparisonRounds, type AnalyticsFilters, type ComparisonMetric } from "../analytics-model";
import styles from "./analytics.module.css";

export function AdvancedInsights({sessions,filters,today}:{sessions:SessionDraft[];filters:AnalyticsFilters;today:string}) {
  const rounds=useMemo(()=>filterComparisonRounds(sessions,filters,today),[sessions,filters,today]);
  const comparison=useMemo(()=>calculateTrainingCompetitionComparison(rounds),[rounds]);
  return <section className={styles.advancedInsights} aria-labelledby="comparison-heading">
    <div className={styles.advancedHeading}><p className={styles.kicker}>Stage 5</p><h2 id="comparison-heading">Training vs Competition</h2><p>{comparison.context}</p></div>
    <div className={styles.panel}><div className={styles.comparisonGrid}><ComparisonCard title="Training" metric={comparison.training}/><ComparisonCard title="Competition" metric={comparison.competition}/></div><div className={styles.differenceRow}><span>Competition minus Training</span><strong>{difference(comparison.competition.average,comparison.training.average," avg / Arrow")}</strong><strong>{difference(comparison.competition.xPercentage,comparison.training.xPercentage," percentage points X")}</strong></div><p className={styles.comparisonNote}>{comparison.groupingContext} The Session-type filter is intentionally ignored here so both groups use the same date and Round-format filters.</p></div>
  </section>;
}

function ComparisonCard({title,metric}:{title:string;metric:ComparisonMetric}) { return <div className={styles.comparisonCard}><h3>{title}</h3><dl><MetricRow label="Average / Arrow" value={metric.average===null?"—":metric.average.toFixed(2)}/><MetricRow label="X percentage" value={percent(metric.xPercentage)}/><MetricRow label="10 + X percentage" value={percent(metric.tenPlusXPercentage)}/><MetricRow label="Saved scored Arrows" value={String(metric.arrowCount)}/><MetricRow label="Grouping spread" value={metric.spread===null?(metric.plottedArrowCount<3?"Need at least 3 plots":"Unavailable for mixed layouts"):metric.spread.toFixed(3)}/></dl></div>; }
function MetricRow({label,value}:{label:string;value:string}) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function signed(value:number) { return `${value>=0?"+":""}${value.toFixed(2)}`; }
function percent(value:number|null) { return value===null?"—":`${value.toFixed(1)}%`; }
function difference(a:number|null,b:number|null,suffix:string) { return a===null||b===null?"Not enough data":`${signed(a-b)}${suffix}`; }
