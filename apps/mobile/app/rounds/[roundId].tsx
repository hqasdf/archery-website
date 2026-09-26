import { Redirect, useLocalSearchParams } from "expo-router";
import { scoreRoundHref } from "../../src/round-navigation";

// Keep old Round URLs usable while scoring remains the single Round workspace.
export default function RoundRedirect() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  return <Redirect href={scoreRoundHref(roundId ?? "")} />;
}
