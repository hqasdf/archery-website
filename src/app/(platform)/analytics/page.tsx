import type { Metadata } from "next";
import { AnalyticsWorkspace } from "@/features/analytics/components/analytics-workspace";
import { readAnalyticsSessions } from "@/features/analytics/read.server";
import { requireUser } from "@/lib/auth/session.server";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireUser();
  const sessions = await readAnalyticsSessions();
  const today = singaporeDate(new Date());
  return <>
    <div className={styles.intro}>
      <p className={styles.eyebrow}>Your performance</p>
      <h1>Analytics</h1>
      <p>See how your saved Arrows are developing across Training and Competition.</p>
    </div>
    <AnalyticsWorkspace sessions={sessions} today={today}/>
  </>;
}

function singaporeDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
