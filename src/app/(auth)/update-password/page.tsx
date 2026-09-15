import Link from "next/link";
import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { requireUser } from "@/lib/auth/session.server";

export const metadata: Metadata = { title: "Update password" };
export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <AuthPanel
      mode="update-password"
      title="Choose a new password."
      description="Use a unique password for your archery journal."
    >
      <Link href="/dashboard">Return to dashboard</Link>
      <Link href="/forgot-password">Request another reset link</Link>
    </AuthPanel>
  );
}
