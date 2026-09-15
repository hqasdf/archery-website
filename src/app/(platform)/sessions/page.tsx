import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { RoundPresetsPanel } from "@/features/sessions/components/round-presets-panel";
import { Icon } from "@/components/ui/icon";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
const bypassAuth = process.env.DEV_BYPASS_AUTH === "true";

if (!bypassAuth) {
  await requireUser();
}  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Your training journal</p>
        <h1>Every session has a place.</h1>
        <p>Training days, competition days, and the rounds in between.</p>
      </div>
      <div className={styles.sessionsGrid}>
        <section
          className={`${styles.empty} ${styles.sessionEmpty}`}
          aria-labelledby="sessions-heading"
        >
          <span className={styles.emptyIcon}>
            <Icon name="sessions" size={28} />
          </span>
          <h2 id="sessions-heading">A clean scorebook.</h2>
          <p>
            No sessions recorded yet. Session entry is the next part of your
            journal to arrive.
          </p>
        </section>
        <RoundPresetsPanel />
      </div>
      <aside className={styles.rule} aria-labelledby="round-policy-heading">
        <h3 id="round-policy-heading">
          A shorter session still belongs in your history.
        </h3>
        <p>
          Incomplete rounds will stay in your log and can count towards training
          volume. Only complete rounds will be used for performance metrics. A
          recorded miss counts as an arrow; an empty score does not.
        </p>
      </aside>
    </>
  );
}
