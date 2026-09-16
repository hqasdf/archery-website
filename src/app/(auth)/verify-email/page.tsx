import Link from "next/link";
import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Verify email" };
export default async function VerifyEmailPage() {
  const email = (await cookies()).get("arc-track-signup-email")?.value;
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/sign-up");
  return (
    <AuthPanel mode="sign-up" verificationMode="email" verificationEmail={email} title="Check your email."
      description="Enter the six-digit code from your email to complete registration.">
      <Link href="/sign-up">Use a different email</Link>
    </AuthPanel>
  );
}
