import Link from "next/link";
import { formatAnalyticsDate } from "@/features/analytics/analytics-model";
import type { CoachSession } from "../coach-read.server";
import type { SessionDraft } from "@/features/sessions/scoring-model";
import { athleteName, latestCompletedRound, roundSummary, thisWeek, type CoachAthlete } from "../coach-model";
import styles from "./coach.module.css";

export function CoachDashboard({ organization, athletes, sessions, today }: {
  organization: { id: string; name: string };
  athletes: CoachAthlete[];
  sessions: CoachSession[];
  today: string;
}) {
  const week = thisWeek(sessions, today);
  const sessionsByAthlete = new Map<string, CoachSession[]>();
  for (const session of sessions) {
    const athleteSessions = sessionsByAthlete.get(session.userId) ?? [];
    athleteSessions.push(session);
    sessionsByAthlete.set(session.userId, athleteSessions);
  }
  return <div className={styles.workspace}>
    <header className={styles.heading}>
      <Link href="/organization" className={styles.back}>← Your organisations</Link>
      <p className={styles.eyebrow}>Head Coach</p>
      <h1>{organization.name}</h1>
    </header>
    <section className={styles.overview} aria-label="Organisation this week">
      <div><strong>{athletes.length}</strong><span>Active athletes</span></div>
      <div><strong>{week.sessionCount}</strong><span>Sessions this week</span></div>
      <div><strong>{week.sessionCount > 0 ? week.arrowCount : "—"}</strong><span>Arrows this week</span></div>
    </section>
    <section className={styles.section}>
      <h2>Athletes</h2>
      {athletes.length === 0 ? <p className={styles.empty}>No active Archers in this organisation yet.</p> :
        <ul className={styles.athleteList}>{athletes.map((athlete) =>
          <AthleteRow key={athlete.userId} organizationId={organization.id} athlete={athlete}
            sessions={sessionsByAthlete.get(athlete.userId) ?? []} today={today}/> )}</ul>}
    </section>

  </div>;
}

function AthleteRow({ organizationId, athlete, sessions, today }: {
  organizationId: string; athlete: CoachAthlete; sessions: SessionDraft[]; today: string;
}) {
  const week = thisWeek(sessions, today);
  const latest = latestCompletedRound(sessions);
  const score = latest ? roundSummary(latest.round) : null;
  return <li><Link href={`/organization/${organizationId}/athletes/${athlete.userId}`} className={styles.athleteLink}>
    <strong>{athleteName(athlete)}</strong>
    <span>{sessions[0] ? `${week.sessionCount > 0 ? `${week.arrowCount} arrows this week` : "No sessions this week"} · Last session ${formatAnalyticsDate(sessions[0].date)}` : "No sessions yet"}</span>
    {latest && score && <span>Latest completed: {latest.round.name} · {score.total} pts · {score.average?.toFixed(2) ?? "—"} avg/Arrow</span>}
  </Link></li>;
}


