import type { CSSProperties } from "react";

type IconName = "arrow" | "dashboard" | "sessions" | "analytics" | "target" | "check" | "profile";

const paths: Record<IconName, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  sessions: "M8 4H5v17h14V4h-3M8 2h8v5H8zm0 10h8m-8 4h5",
  analytics: "M4 19V9m6 10V5m6 14v-7m4 7V3",
  target: "M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 9-9m-5 0h5v5",
  check: "m5 12 4 4L19 6",
  profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
};

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
