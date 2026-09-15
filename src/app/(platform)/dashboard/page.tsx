import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { ActionLink } from "@/components/ui/action-link";
import { Icon } from "@/components/ui/icon";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireUser();
  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Your practice</p>
        <h1>Your training, at a glance.</h1>
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
          <span>Your history starts here</span>
        </div>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="sessions" size={23} />
          </span>
          <h3>No sessions yet</h3>
          <p>
            Once session recording is available, your training and competition
            history will appear here.
          </p>
        </div>
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
