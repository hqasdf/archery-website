import Link from "next/link";
import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/components/auth-panel";

export const metadata: Metadata = { title: "Reset password" };
export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      mode="forgot-password"
      title="Let’s get you back in."
      description="Enter your email address to request a six-digit recovery code."
    >
      <Link href="/sign-in">Back to sign in</Link>
    </AuthPanel>
  );
}
