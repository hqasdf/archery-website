import { StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

export function Placeholder({ title }: { title: string }) {
  return <View style={styles.page}><Text style={styles.title}>{title}</Text><Text style={styles.message}>Coming next</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, gap: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  message: { color: colors.muted, fontSize: 15 },
});
