import Link from "next/link";
import { formatAnalyticsDate } from "@/features/analytics/analytics-model";
import type { SessionDraft } from "@/features/sessions/scoring-model";
import { athleteAnalytics, athleteName, completedRounds, roundSummary, thisWeek, type CoachAthlete } from "../coach-model";
import styles from "./coach.module.css";

export function CoachAthleteDetail({ organization, athlete, sessions, today }: {
  organization: { id: string; name: string };
  athlete: CoachAthlete;
  sessions: SessionDraft[];
  today: string;
}) {
  const week = thisWeek(sessions, today);
  const { overview, volume, grouping } = athleteAnalytics(sessions, today);
  const recentRounds = completedRounds(sessions).slice(0, 3);
  const recentVolume = volume.slice(-7).reverse();
  const maxVolume = Math.max(...recentVolume.map((point) => point.arrowCount));
  return <div className={styles.workspace}>
    <header className={styles.heading}>
      <Link href={`/organization/${organization.id}`} className={styles.back}>← {organization.name}</Link>
      <p className={styles.eyebrow}>Organisation athlete · Active</p>
      <h1>{athleteName(athlete)}</h1>
      <p>Read-only view of this Archer&apos;s Sessions.</p>
    </header>
    <section className={styles.overview} aria-label="Athlete overview">
      <div><strong>{sessions.length}</strong><span>Sessions</span></div>
      <div><strong>{week.sessionCount > 0 ? week.arrowCount : "—"}</strong><span>Arrows this week</span></div>
      <div><strong>{overview.totalArrows}</strong><span>Scored Arrows</span></div>
      <div><strong>{overview.averagePerArrow === null ? "—" : overview.averagePerArrow.toFixed(2)}</strong><span>Avg/Arrow</span></div>
      <div><strong>{overview.xPercentage === null ? "—" : `${overview.xCount} · ${overview.xPercentage.toFixed(1)}%`}</strong><span>X count · X%</span></div>
    </section>
    <section className={styles.section}>
      <h2>Recent Sessions</h2>
      {sessions.length === 0 ? <p className={styles.empty}>No Sessions recorded for this athlete yet.</p> :
        <ul className={styles.recordList}>{sessions.slice(0, 5).map((session) => <li key={session.id}>
          <div><strong>{session.title}</strong><span>{formatAnalyticsDate(session.date)} · {session.sessionType === "competition" ? "Competition" : "Training"}</span></div>
          <div>{session.arrowCount > 0 && <span>{session.arrowCount} arrows</span>}
            {session.rounds.length > 0 && <span>{session.rounds.map((round) => round.name).join(" · ")}</span>}</div>
        </li>)}</ul>}
    </section>
    <section className={styles.section}>
      <h2>Latest completed Rounds</h2>
      {recentRounds.length === 0 ? <p className={styles.empty}>No completed Rounds yet.</p> :
        <ul className={styles.recordList}>{recentRounds.map(({ session, round }) => {
          const score = roundSummary(round);
          return <li key={round.id}><div><strong>{round.name} · {round.distanceMetres} m</strong>
            <span>{formatAnalyticsDate(session.date)} · {round.faceDiameterCm} cm {round.faceType.replaceAll("_", " ")}</span></div>
            <div><strong>{score.total} pts</strong><span>{score.average?.toFixed(2) ?? "—"} avg/Arrow · {score.xCount}X</span></div>
          </li>;
        })}</ul>}
    </section>
    <section className={styles.section}>
      <h2>Arrow Volume</h2>
      <p className={styles.note}>Session Arrow count, grouped by date.</p>
      {volume.length === 0 ? <p className={styles.empty}>No Arrow Volume recorded yet.</p> :
        <ul className={styles.volumeList}>{recentVolume.map((point) => <li key={point.key}>
          <span>{formatAnalyticsDate(point.startDate)}</span><div className={styles.volumeTrack}><span style={{ width: `${maxVolume > 0 ? point.arrowCount / maxVolume * 100 : 0}%` }}/></div><strong>{point.arrowCount}</strong>
        </li>)}</ul>}
    </section>
    {grouping && <section className={styles.section}>
      <h2>Latest completed Round grouping</h2>
      <p className={styles.note}>{grouping.arrowCount} plotted Arrows. Triple-face positions use each spot’s local coordinates.</p>
      {grouping.groupSizeCm !== null && <div className={styles.groupingNumbers}>
        <div><strong>{grouping.groupSizeCm.toFixed(1)} cm</strong><span>Group size</span></div>
        <div><strong>{grouping.spreadCm === null ? "—" : `${grouping.spreadCm.toFixed(1)} cm`}</strong><span>RMS spread</span></div>
      </div>}
    </section>}
  </div>;
}

