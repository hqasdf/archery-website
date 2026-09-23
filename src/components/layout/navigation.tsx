"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import styles from "./shell.module.css";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/sessions", label: "Sessions", icon: "sessions" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/profile", label: "Profile", icon: "profile" },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className={styles.navigation}>
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={styles.navLink}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={icon} size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
