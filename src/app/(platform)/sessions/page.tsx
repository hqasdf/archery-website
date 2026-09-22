import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { readOwnDisplayName } from "@/features/profile/read.server";
import { SessionsWorkspace } from "@/features/sessions/components/sessions-workspace";
import { readSessions } from "@/features/sessions/read.server";
import styles from "@/styles/pages.module.css";
export const metadata: Metadata = { title: "Sessions" };
export default async function SessionsPage() {
  await requireUser();
  const displayName = await readOwnDisplayName();
  const sessions = await readSessions();
  return <>
    <div className={styles.intro}>
      <p className={styles.eyebrow}>Your training journal</p>
      <h1 style={{ overflowWrap: "anywhere" }}>Your sessions, {displayName}</h1>
      <p>Create a session, add your rounds, and score one arrow at a time.</p>
    </div>
    <SessionsWorkspace initialSessions={sessions}/>
  </>;
}
