import { calculateEndAnalysis, calculateRoundGroupingInsights, type EndPoint, type RoundGroupingInsights } from "../session-insights-model";
import type { RoundDraft, TargetFaceType } from "../scoring-model";
import styles from "./sessions.module.css";

const ringColours: Record<number,string> = {1:"#f4f1e9",.9:"#f4f1e9",.8:"#202020",.7:"#202020",.6:"#49a4cf",.5:"#49a4cf",.4:"#e65a55",.3:"#e65a55",.2:"#f5cf3d",.1:"#f5cf3d"};
const fullRings=[1,.9,.8,.7,.6,.5,.4,.3,.2,.1];
const sixRings=[.6,.5,.4,.3,.2,.1];
const tripleRings=[.5,.4,.3,.2,.1];
const tripleCentres=[-110,0,110] as const;
const views={full_face:"-105 -105 210 210",six_ring:"-65 -65 130 130",triple_face:"-58 -168 116 336"} as const;

export function RoundInsights({round}:{round:RoundDraft}) {
  const endAnalysis=calculateEndAnalysis(round);
  const grouping=calculateRoundGroupingInsights(round);
  return <section className={styles.sessionInsights} aria-labelledby="session-insights-heading">
    <div className={styles.insightsHeading}><div><p className={styles.kicker}>Saved performance</p><h2 id="session-insights-heading">Round Insights</h2><p>Review this Round using its saved Ends and target plots.</p></div></div>
    <div className={styles.insightsGrid}>
      <article className={styles.insightCard} aria-labelledby="end-performance-heading"><p className={styles.kicker}>Within the selected Round</p><h3 id="end-performance-heading">End Performance</h3><EndChart ends={endAnalysis.ends}/><div className={styles.insightMetrics}><Metric label="Best completed End" value={endAnalysis.best?`End ${endAnalysis.best.endNumber} · ${endAnalysis.best.average!.toFixed(2)} avg`:"No completed End"}/><Metric label="Worst completed End" value={endAnalysis.worst?`End ${endAnalysis.worst.endNumber} · ${endAnalysis.worst.average!.toFixed(2)} avg`:"No completed End"}/><Metric label="Completed-End average" value={endAnalysis.average===null?"No completed End":`${endAnalysis.average.toFixed(2)} / Arrow`}/><Metric label="Consistency" value={endAnalysis.consistency===null?"Need at least two completed Ends":`${endAnalysis.consistency.toFixed(2)} standard deviation`}/></div><p className={styles.insightNote}>{endAnalysis.trendSlope===null?"End trend: Need at least two completed Ends.":`Completed-End trend slope: ${signed(endAnalysis.trendSlope)} average points per End.`}</p></article>
      <article className={styles.insightCard} aria-labelledby="grouping-insights-heading"><p className={styles.kicker}>Saved target coordinates</p><h3 id="grouping-insights-heading">Target / Grouping Insights</h3><GroupingTarget round={round} grouping={grouping}/><p className={styles.insightNote}>{grouping.arrows.length} plotted {grouping.arrows.length===1?"Arrow":"Arrows"}{grouping.missingPlotCount?` · ${grouping.missingPlotCount} without plot coordinates`:""}{grouping.unassignedTripleCount?` · ${grouping.unassignedTripleCount} Triple-face plots without face index excluded`:""}</p><GroupingMetrics grouping={grouping}/></article>
    </div>
  </section>;
}

function EndChart({ends}:{ends:EndPoint[]}) {
  const shown=ends.filter((end)=>end.average!==null);
  if (shown.length===0) return <div className={styles.insightEmpty}>No saved Arrows in this Round yet.</div>;
  return <><div className={styles.sessionEndChart}>{shown.map((end)=><div key={end.endNumber} className={styles.sessionEndColumn}><div className={styles.sessionEndTrack}><div className={`${styles.sessionEndBar} ${end.complete?"":styles.sessionEndPartial}`} style={{height:`${Math.max(4,end.average!/10*100)}%`}}/></div><strong>{end.average!.toFixed(2)}</strong><span>End {end.endNumber}</span><small>{end.complete?`Completed · ${end.arrowCount}`:`Partial · ${end.arrowCount}/${end.expectedArrowCount}`}</small></div>)}</div><p className={styles.insightNote}>Partial Ends are shown for context and excluded from all summaries.</p></>;
}

function GroupingTarget({round,grouping}:{round:RoundDraft;grouping:RoundGroupingInsights}) {
  if (grouping.arrows.length===0) return <div className={styles.insightEmpty}>No target plots saved for this Round yet.</div>;
  return <div className={`${styles.insightTarget} ${round.faceType==="triple_face"?styles.insightTripleTarget:""}`}><svg viewBox={views[round.faceType]} role="img" aria-label={`${faceLabel(round.faceType)} showing ${grouping.arrows.length} plotted Arrows`}>
    {round.faceType==="triple_face"?tripleCentres.map((cy)=><Face key={cy} cy={cy} radii={tripleRings}/>):<Face cy={0} radii={round.faceType==="six_ring"?sixRings:fullRings}/>} 
    {grouping.arrows.map((arrow)=>{const cy=round.faceType==="triple_face"?tripleCentres[arrow.faceIndex??1]:0;return <circle key={arrow.id} cx={arrow.x*100} cy={cy+arrow.y*100} r="3.2" className={styles.insightMarker}/>;})}
  </svg></div>;
}

function GroupingMetrics({grouping}:{grouping:RoundGroupingInsights}) {
  const metrics=grouping.metrics;
  if (!metrics) return null;
  return <div className={styles.groupingInsightMetrics}><Metric label="Group centre" value={`${axis(metrics.centreX,"right","left")} · ${axis(metrics.centreY,"low","high")}`}/><Metric label="Horizontal offset" value={axis(metrics.centreX,"right","left")}/><Metric label="Vertical offset" value={axis(metrics.centreY,"low","high")}/><Metric label="Group size" value={metrics.groupSizeCm===null?"Need at least 3 plotted Arrows":`${metrics.groupSizeCm.toFixed(1)} cm`}/><Metric label="RMS spread" value={metrics.spreadCm===null?"Need at least 3 plotted Arrows":`${metrics.spreadCm.toFixed(1)} cm`}/></div>;
}

function Metric({label,value}:{label:string;value:string}) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Face({cy,radii}:{cy:number;radii:number[]}) { return <g>{radii.map((radius)=><circle key={radius} cx="0" cy={cy} r={radius*100} fill={ringColours[radius]} stroke="#4b443e" strokeWidth=".7"/>)}<circle cx="0" cy={cy} r="5" fill="none" stroke="#4b443e" strokeWidth=".7"/><circle cx="0" cy={cy} r="1.5" fill="none" stroke="#4b443e" strokeWidth=".6"/></g>; }
function faceLabel(faceType:TargetFaceType) { return faceType==="triple_face"?"Triple-face target":faceType==="six_ring"?"Six-ring target":"Full-face target"; }
function signed(value:number) { return `${value>=0?"+":""}${value.toFixed(2)}`; }
function axis(value:number,positive:string,negative:string) { if (value===0) return "0.00 centred"; return `${Math.abs(value).toFixed(2)} ${value>0?positive:negative}`; }
