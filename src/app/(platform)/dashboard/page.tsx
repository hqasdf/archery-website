import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { readOwnDisplayName } from "@/features/profile/read.server";
import { ActionLink } from "@/components/ui/action-link";
import { Icon } from "@/components/ui/icon";
import { readRecentTrainingSessions } from "@/features/sessions/read.server";
import { roundTotal } from "@/features/sessions/scoring-model";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireUser();
  const [displayName, recentSessions] = await Promise.all([
    readOwnDisplayName(),
    readRecentTrainingSessions(3),
  ]);

  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Your practice</p>
        <h1 style={{ overflowWrap: "anywhere" }}>Welcome back, {displayName}</h1>
        <p>Improving slowly. A clearer picture over time.</p>
      </div>
      <section className={styles.hero} aria-labelledby="start-heading">
        <div className={styles.heroCopy}>
          <h2 id="start-heading">It starts with a session.</h2>
          <p>
            Your scores, equipment, and time at the range will come together
            here. Start by exploring the rounds you can record.
          </p>
          <ActionLink href="/sessions">Explore sessions</ActionLink>
        </div>
        <div className={styles.illustration} aria-hidden="true">
          <Icon name="target" size={76} />
        </div>
      </section>
      <section aria-labelledby="recent-heading">
        <div className={styles.sectionHeading}>
          <h2 id="recent-heading">Recent sessions</h2>
          <ActionLink href="/sessions" secondary>View all Sessions</ActionLink>
        </div>
        {recentSessions.length === 0 ? <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="sessions" size={23} />
          </span>
          <h3>No Training Sessions yet</h3>
          <p>Your recent saved training will appear here.</p>
        </div> : <div className={styles.recentSessions}>{recentSessions.map((session)=><article key={session.id} className={styles.recentSession}><div className={styles.recentSessionTop}><div><p className={styles.recentDate}>{formatSessionDate(session.date)}</p><h3>{session.title}</h3></div><span>{session.arrowCount} arrows</span></div>{session.rounds.length===0?<p className={styles.recentNoRounds}>No Rounds recorded yet.</p>:<ul className={styles.recentRounds}>{session.rounds.map((round)=><li key={round.id}><span>{round.name} · {round.distanceMetres} m</span><strong>Score: {roundTotal(round.arrows)}</strong></li>)}</ul>}</article>)}</div>}
      </section>
      <div className={styles.note}>
        <Icon name="check" size={18} />
        <p>
          Recurve or compound. Indoor or outdoor. Room for your way of training.
        </p>
      </div>
    </>
  );
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
