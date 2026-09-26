import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { readOwnDisplayName } from "@/features/profile/read.server";
import { SessionsWorkspace } from "@/features/sessions/components/sessions-workspace";
import { readSessions } from "@/features/sessions/read.server";
import styles from "@/styles/pages.module.css";
export const metadata: Metadata = { title: "Sessions" };
export default async function SessionsPage() {
  await requireUser();
  const [displayName, sessions] = await Promise.all([
    readOwnDisplayName(), readSessions(),
  ]);
  return <>
    <div className={styles.intro}>
      <h1 style={{ overflowWrap: "anywhere" }}>Your sessions, {displayName}</h1>
    </div>
    <SessionsWorkspace initialSessions={sessions}/>
  </>;
}
