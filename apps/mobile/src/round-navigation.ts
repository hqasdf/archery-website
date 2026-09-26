export function scoreRoundHref(roundId: string) {
  return { pathname: "/rounds/[roundId]/score" as const, params: { roundId } };
}
