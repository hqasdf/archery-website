import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session.server";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();

  return <AppShell authenticated>{children}</AppShell>;
}
