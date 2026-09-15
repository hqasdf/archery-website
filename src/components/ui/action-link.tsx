import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";
import styles from "./action-link.module.css";

export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${styles.link} ${secondary ? styles.secondary : ""}`}
    >
      {children}
      <Icon name="arrow" size={17} />
    </Link>
  );
}
