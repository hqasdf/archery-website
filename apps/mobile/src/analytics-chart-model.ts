export const ANALYTICS_AXIS_LABELS = {
  trendX: "Session date",
  trendY: "Avg score / Arrow",
  volumeX: { daily: "Session date", weekly: "Calendar week (Mon–Sun)" },
  volumeY: "Arrow count",
} as const;

export function verticalBarHeight(count: number, maxCount: number, maxHeight: number) {
  if (!Number.isFinite(count) || count <= 0 || maxCount <= 0 || maxHeight <= 0) return 3;
  return Math.max(3, Math.min(maxHeight, count / maxCount * maxHeight));
}
