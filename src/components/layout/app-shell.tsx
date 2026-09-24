import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { Navigation } from "./navigation";
import styles from "./shell.module.css";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export function AppShell({
  children,
  authenticated = false,
}: {
  children: ReactNode;
  authenticated?: boolean;
}) {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href="/dashboard"
            className={styles.brand}
            aria-label="Arc Track dashboard"
          >
            <span className={styles.brandMark}>
              <Icon name="target" size={24} />
            </span>
            <span>
              <span className={styles.brandName}>ARC TRACK</span>
              <span className={styles.brandCaption}>Archery Performance Tracker</span>
            </span>
          </Link>
          <Navigation />
          {authenticated ? (
            <SignOutButton />
          ) : (
            <Link href="/sign-in" className={styles.preview}>
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
