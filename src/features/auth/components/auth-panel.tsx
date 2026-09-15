import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { getAuthConfig } from "@/lib/auth/config";
import { AuthForm } from "./auth-form";
import type { AuthMode } from "../validation";
import styles from "./auth.module.css";

export function AuthPanel({
  title,
  description,
  mode,
  notice,
  children,
}: {
  title: string;
  description: string;
  mode: AuthMode;
  notice?: string;
  children?: ReactNode;
}) {
  const configured = Boolean(getAuthConfig());
  return (
    <main id="main-content" className={styles.page}>
      <Link href="/sign-in" className={styles.brand}>
        <Icon name="target" size={28} />
        ARC TRACK
      </Link>
      <section className={styles.card} aria-labelledby="auth-heading">
        <p className={styles.eyebrow}>Your archery journal</p>
        <h1 id="auth-heading">{title}</h1>
        <p className={styles.description}>{description}</p>
        {!configured && (
          <div className={styles.message} role="status">
            <strong>Account setup is in progress.</strong>
            <p>
              Sign-in will be available once this app is connected. These fields
              are disabled until then.
            </p>
          </div>
        )}
        {notice && (
          <p className={styles.message} role="status">
            {notice}
          </p>
        )}
        <AuthForm mode={mode} configured={configured} />
        <div className={styles.links}>{children}</div>
      </section>
      <p className={styles.footnote}>Recurve & compound · One end at a time.</p>
    </main>
  );
}
