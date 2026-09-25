import type { Metadata } from "next";
import { AnalyticsWorkspace } from "@/features/analytics/components/analytics-workspace";
import { readAnalyticsSessions } from "@/features/analytics/read.server";
import { requireUser } from "@/lib/auth/session.server";
import { singaporeDate } from "@/lib/date";
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
    </div>
    <AnalyticsWorkspace sessions={sessions} today={today}/>
  </>;
}
