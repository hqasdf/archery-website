import { formatDateOnly } from "@arc-track/core/dates";
import { arrowAverage, roundTotal } from "@arc-track/core/scoring";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/auth";
import { singaporeToday } from "../../src/mobile-analytics";
import {
  athleteLabel, readCoachAthletes, readCoachOrganization, readCoachOrganizationSessions,
  type CoachAthlete,
} from "../../src/organizations";
import { colors, PAGE_TOP_SPACING } from "../../src/theme";
import type { SessionDraft } from "@arc-track/core/scoring";

type CoachSession = SessionDraft & { userId: string };
export default function CoachDashboardScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [athletes, setAthletes] = useState<CoachAthlete[] | null>(null);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user || !organizationId) return;
    setLoading(true); setError(null);
    try {
      const org = await readCoachOrganization(user.id, organizationId);
      if (!org) { setAthletes(null); return; }
      const roster = await readCoachAthletes(user.id, organizationId);
      if (!roster) { setAthletes(null); return; }
      setName(org.name); setAthletes(roster);
      setSessions(await readCoachOrganizationSessions(user.id, organizationId, roster) ?? []);
    } catch { setError("Coach Dashboard could not be loaded. Try again."); }
    finally { setLoading(false); }
  }, [user, organizationId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <View style={styles.state}><ActivityIndicator color={colors.accent} /></View>;
  if (error) return <View style={styles.state}><Text style={styles.muted}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.link}>Retry</Text></Pressable></View>;
  if (!athletes) return <View style={styles.state}><Text style={styles.muted}>Coach access is unavailable for this organisation.</Text></View>;
  const today = singaporeToday(new Date());
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const weekStart = monday.toISOString().slice(0, 10);
  const thisWeek = sessions.filter((session) => session.date >= weekStart && session.date <= today);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.title}>{name}</Text><Text style={styles.muted}>Head Coach · read only</Text>
    <View style={styles.metrics}>
      <Metric label="ATHLETES" value={String(athletes.length)} />
      <Metric label="ARROWS THIS WEEK" value={String(thisWeek.reduce((sum, session) => sum + session.arrowCount, 0))} />
      <Metric label="SESSIONS THIS WEEK" value={String(thisWeek.length)} />
    </View>
    <Text style={styles.heading}>Athletes</Text>
    {athletes.length === 0 ? <Text style={styles.muted}>No active Archer members yet.</Text> : athletes.map((athlete) => {
      const own = sessions.filter((session) => session.userId === athlete.userId);
      const latest = own.flatMap((session) => session.rounds.map((round) => ({ session, round })))
        .filter(({ round }) => round.arrows.length > 0 && round.arrows.length === round.ends * round.arrowsPerEnd)[0];
      const weekly = own.filter((session) => session.date >= weekStart && session.date <= today)
        .reduce((sum, session) => sum + session.arrowCount, 0);
      return <Pressable key={athlete.userId} accessibilityRole="button" onPress={() => router.push({ pathname: "/organization/[organizationId]/athletes/[userId]", params: { organizationId, userId: athlete.userId } })} style={styles.athlete}>
        <Text style={styles.athleteName}>{athleteLabel(athlete)}</Text>
        <Text style={styles.muted}>{weekly} arrows this week{own[0] ? ` · Last Session ${formatDateOnly(own[0].date, false)}` : ""}</Text>
        {latest ? <Text style={styles.muted}>Latest completed: {roundTotal(latest.round.arrows)} pts · {arrowAverage(latest.round.arrows)?.toFixed(2)} avg</Text> : null}
      </Pressable>;
    })}
  </ScrollView>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 18, paddingTop: 18 + PAGE_TOP_SPACING, paddingBottom: 35, gap: 9 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800" }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, metric: { minWidth: 90, flexGrow: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 11 },
  label: { color: colors.muted, fontSize: 10, fontWeight: "700" }, value: { color: colors.text, fontSize: 20, fontWeight: "800" },
  heading: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 16 },
  athlete: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  athleteName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  state: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  link: { color: colors.accent, fontWeight: "700" },
});
