import type { RoundDraft } from "@arc-track/core/scoring";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisTarget } from "./analysis-target";
import { mobileRoundInsights } from "./mobile-analytics";
import { colors } from "./theme";

const number = (value: number | null) => value === null ? "—" : value.toFixed(2);
const percent = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
function axis(value: number, positive: string, negative: string, radiusCm: number) {
  return `${(Math.abs(value) * radiusCm).toFixed(1)} cm ${value >= 0 ? positive : negative}`;
}

export function RoundInsights({ round }: { round: RoundDraft }) {
  const insight = mobileRoundInsights(round);
  const metrics = insight.grouping.metrics;
  const flyerIds = new Set(insight.mainGroup.flyers.map((arrow) => arrow.id));
  return <View style={styles.section}>
    <Text style={styles.heading}>Round Insights</Text>
    <Text style={styles.subheading}>{insight.complete ? "Completed Round" : "Round in progress"}</Text>
    <View style={styles.grid}>
      <Metric label="Score" value={String(insight.total)} />
      <Metric label="Recorded Arrows" value={`${insight.arrowCount}/${round.ends * round.arrowsPerEnd}`} />
      <Metric label="Avg / Arrow" value={number(insight.average)} />
      <Metric label="X" value={`${insight.overview.xCount} · ${percent(insight.overview.xPercentage)}`} />
      <Metric label="10 + X" value={`${insight.tenPlusXCount} · ${percent(insight.overview.tenPlusXPercentage)}`} />
    </View>

    <Text style={styles.subheading}>Grouping</Text>
    {insight.grouping.arrows.length ? <>
      <AnalysisTarget faceType={round.faceType} arrows={insight.grouping.arrows} centre={metrics ? { x: metrics.centreX, y: metrics.centreY } : null} flyerIds={flyerIds} />
      <Text style={styles.note}>{insight.grouping.arrows.length} plotted Arrows{flyerIds.size ? ` · ${flyerIds.size} possible ${flyerIds.size === 1 ? "flyer" : "flyers"}` : ""}</Text>
      {metrics ? <View style={styles.grid}>
        <Metric label="Group position" value={`${axis(metrics.centreX, "right", "left", round.faceDiameterCm / 2)} · ${axis(metrics.centreY, "low", "high", round.faceDiameterCm / 2)}`} />
        <Metric label="Group size" value={metrics.groupSizeCm === null ? "Need 3 plots" : `${metrics.groupSizeCm.toFixed(1)} cm`} />
        <Metric label="RMS spread" value={metrics.spreadCm === null ? "Need 3 plots" : `${metrics.spreadCm.toFixed(1)} cm`} />
      </View> : null}
    </> : <Text style={styles.note}>No plotted Arrows yet.</Text>}

    <Text style={styles.subheading}>End Performance</Text>
    {insight.ends.ends.filter((end) => end.arrowCount > 0).length ? insight.ends.ends.filter((end) => end.arrowCount > 0).map((end) =>
      <View key={end.endNumber} style={styles.endRow}>
        <Text style={styles.endLabel}>End {end.endNumber} · {end.complete ? "Complete" : `Partial ${end.arrowCount}/${end.expectedArrowCount}`}</Text>
        <Text style={styles.endValue}>{end.total} pts · {number(end.average)} avg</Text>
      </View>
    ) : <Text style={styles.note}>No scored Ends yet.</Text>}
    <Text style={styles.note}>Best completed End: {insight.ends.best ? `End ${insight.ends.best.endNumber} · ${number(insight.ends.best.average)} avg` : "—"}</Text>
    <Text style={styles.note}>Consistency: {insight.ends.consistency === null ? "Need at least two completed Ends" : `${insight.ends.consistency.toFixed(2)} points/Arrow`}</Text>
  </View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  section: { gap: 10, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, marginTop: 8 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subheading: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 9 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48%", minWidth: 120, flexGrow: 1, backgroundColor: colors.surface, padding: 11, borderRadius: 10 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  value: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 3 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  endRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 5, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 7 },
  endLabel: { color: colors.text, fontSize: 13 },
  endValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
});
