import { AppShell } from "@/components/layout/app-shell";
import { ActionLink } from "@/components/ui/action-link";
import styles from "@/styles/pages.module.css";

export default function NotFound() {
  return (
    <AppShell>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Page not found</p>
        <h1>Let’s get you back on track.</h1>
        <p>
          This page does not exist. Sessions is a good place to start.
        </p>
      </div>
      <ActionLink href="/sessions">Back to Sessions</ActionLink>
    </AppShell>
  );
}
