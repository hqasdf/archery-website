import { formatDateOnly } from "@arc-track/core/dates";
import { arrowAverage, roundTotal, type RoundDraft, type SessionDraft } from "@arc-track/core/scoring";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RoundInsights } from "../../../../src/round-insights";
import { useAuth } from "../../../../src/auth";
import { athleteLabel, readCoachAthleteSessions, readCoachAthletes, type CoachAthlete } from "../../../../src/organizations";
import { colors, PAGE_TOP_SPACING } from "../../../../src/theme";

export default function CoachAthleteScreen() {
  const { organizationId, userId } = useLocalSearchParams<{ organizationId: string; userId: string }>();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState<CoachAthlete | null>(null);
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user || !organizationId || !userId) return;
    setLoading(true); setError(null);
    try {
      const roster = await readCoachAthletes(user.id, organizationId);
      const match = roster?.find((item) => item.userId === userId) ?? null;
      if (!match) { setAthlete(null); setSessions([]); return; }
      const loaded = await readCoachAthleteSessions(user.id, organizationId, userId, roster ?? undefined);
      setAthlete(match); setSessions(loaded ?? []);
      setSelectedRound((previous) => loaded?.flatMap((session) => session.rounds).find((round) => round.id === previous?.id) ?? null);
    } catch { setError("Athlete Sessions could not be loaded. Try again."); }
    finally { setLoading(false); }
  }, [user, organizationId, userId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <View style={styles.state}><ActivityIndicator color={colors.accent} /></View>;
  if (error) return <View style={styles.state}><Text style={styles.muted}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.link}>Retry</Text></Pressable></View>;
  if (!athlete) return <View style={styles.state}><Text style={styles.muted}>This athlete is not available in your active roster.</Text></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.title}>{athleteLabel(athlete)}</Text>
    <Text style={styles.muted}>Organisation athlete · read only</Text>
    <Text style={styles.heading}>Sessions</Text>
    {sessions.length === 0 ? <Text style={styles.muted}>No Sessions are available for this athlete.</Text> : sessions.map((session) =>
      <View key={session.id} style={styles.card}>
        <Text style={styles.session}>{session.title}</Text>
        <Text style={styles.muted}>{formatDateOnly(session.date, false)} · {session.sessionType} · {session.arrowCount} arrows</Text>
        {session.rounds.length === 0 ? <Text style={styles.muted}>No Rounds yet.</Text> : session.rounds.map((round) =>
          <Pressable key={round.id} accessibilityRole="button" onPress={() => setSelectedRound(round)} style={styles.round}>
            <Text style={styles.roundName}>{round.name} · {round.distanceMetres} m</Text>
            <Text style={styles.muted}>{roundTotal(round.arrows)} pts · {round.arrows.length} recorded · {arrowAverage(round.arrows)?.toFixed(2) ?? "—"} avg/Arrow</Text>
          </Pressable>)}
      </View>)}
    {selectedRound ? <View style={styles.insight}>
      <Pressable accessibilityRole="button" onPress={() => setSelectedRound(null)}><Text style={styles.link}>Close Round detail</Text></Pressable>
      <RoundInsights round={selectedRound} />
    </View> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 18, paddingTop: 18 + PAGE_TOP_SPACING, paddingBottom: 36, gap: 10 },
  state: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800" }, heading: { color: colors.text, fontSize: 19, fontWeight: "700", marginTop: 16 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, link: { color: colors.accent, fontWeight: "700", paddingVertical: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 13, gap: 5, borderWidth: 1, borderColor: colors.border },
  session: { color: colors.text, fontSize: 16, fontWeight: "700" },
  round: { borderTopWidth: 1, borderColor: colors.border, paddingVertical: 10, minHeight: 50, gap: 3 },
  roundName: { color: colors.text, fontSize: 14, fontWeight: "700" }, insight: { marginTop: 12, gap: 8 },
});
