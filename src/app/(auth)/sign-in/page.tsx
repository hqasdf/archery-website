import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { readIdentity } from "@/lib/auth/session.server";

export const metadata: Metadata = { title: "Sign in" };
const notices: Record<string, string> = {
  "invalid-link":
    "This link is invalid or has expired. Open the latest email in the browser where you requested it, or request a fresh password reset.",
  "signed-out": "You are signed out on this browser.",
  unavailable:
    "We could not verify your account right now. Please try again shortly.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { user } = await readIdentity();
  if (user) redirect("/sessions");
  const { status } = await searchParams;
  const notice =
    typeof status === "string" && Object.hasOwn(notices, status)
      ? notices[status]
      : undefined;
  return (
    <AuthPanel
      mode="sign-in"
      title="Welcome back."
      description="Sign in to your archery journal."
      notice={notice}
    >
      <Link href="/forgot-password">Forgot your password?</Link>
      <Link href="/sign-up">New here? Create an account</Link>
    </AuthPanel>
  );
}
