import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../src/auth";
import {
  createOrganization, joinOrganization, leaveOrganization, readOwnOrganizations, regenerateJoinCode,
  type OwnOrganization,
} from "../../src/organizations";
import { colors, PAGE_TOP_SPACING } from "../../src/theme";

export default function OrganizationScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<OwnOrganization[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try { setItems(await readOwnOrganizations(user.id)); }
    catch { setError("Organisations could not be loaded. Check your connection and try again."); }
    finally { setLoading(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function run(task: () => Promise<string>) {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { const message = await task(); setNotice(message); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The organisation request could not be completed."); }
    finally { setBusy(false); }
  }
  function confirmLeave(item: OwnOrganization) {
    Alert.alert(`Leave ${item.name}?`, "Your active membership will end.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => void run(async () => { await leaveOrganization(item.id); return `You left ${item.name}.`; }) },
    ]);
  }
  function confirmRegenerate(item: OwnOrganization) {
    Alert.alert("Generate a new join code?", "The current code will stop working.", [
      { text: "Cancel", style: "cancel" },
      { text: "Generate", onPress: () => void run(async () => { await regenerateJoinCode(item.id); return "A new join code is ready."; }) },
    ]);
  }

  if (loading && items.length === 0) return <View style={styles.state}><ActivityIndicator color={colors.accent} /></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Organisation</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    {error && items.length === 0 ? <Button label="Retry" onPress={() => void load()} /> : null}
    <Text style={styles.heading}>Your organisations</Text>
    {items.length === 0 ? <Text style={styles.muted}>You have not joined an organisation yet.</Text> : items.map((item) =>
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.muted}>{item.role === "head_coach" ? "Head Coach" : "Archer"} · Active</Text>
        {item.role === "head_coach" ? <>
          <Button label="Open Coach Dashboard" onPress={() => router.push({ pathname: "/organization/[organizationId]", params: { organizationId: item.id } })} />
          <Text style={styles.label}>JOIN CODE</Text>
          <Text selectable style={styles.joinCode}>{item.joinCode ?? "Unavailable"}</Text>
          <Button label="Generate New Code" disabled={busy} onPress={() => confirmRegenerate(item)} />
        </> : null}
        <Button label="Leave organisation" disabled={busy} onPress={() => confirmLeave(item)} />
      </View>)}
    <Text style={styles.heading}>Join an organisation</Text>
    <TextInput accessibilityLabel="Join code" value={code} onChangeText={setCode} autoCapitalize="characters"
      maxLength={16} placeholder="AB7K4M2Q" style={styles.input} />
    <Button label={busy ? "Working…" : "Join as Archer"} disabled={busy} onPress={() => void run(async () => {
      const result = await joinOrganization(code); setCode("");
      return result === "already_member" ? "You are already a member." : "You joined as an Archer.";
    })} />
    <Text style={styles.heading}>Create an organisation</Text>
    <TextInput accessibilityLabel="Organisation name" value={name} onChangeText={setName} maxLength={120}
      placeholder="Club or team name" style={styles.input} />
    <Button label="Create organisation" disabled={busy} onPress={() => void run(async () => {
      const created = await createOrganization(user!.id, name); setName(""); return `${created.name} was created.`;
    })} />
  </ScrollView>;
}
function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}>
    <Text style={[styles.buttonText, disabled && styles.disabled]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingTop: 18 + PAGE_TOP_SPACING, paddingBottom: 40, gap: 10 },
  title: { color: colors.text, fontSize: 27, fontWeight: "800" },
  heading: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 9 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  joinCode: { color: colors.text, fontSize: 23, fontWeight: "800", letterSpacing: 2 },
  input: { backgroundColor: colors.surface, color: colors.text, minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, fontSize: 16 },
  button: { minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: colors.accent, justifyContent: "center", alignItems: "center", paddingHorizontal: 10 },
  buttonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: .4 },
  notice: { color: colors.accent, fontSize: 13 },
  error: { color: colors.error, fontSize: 13 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
