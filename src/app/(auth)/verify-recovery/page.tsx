import Link from "next/link";
import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/components/auth-panel";

export const metadata: Metadata = { title: "Verify recovery code" };
export default function VerifyRecoveryPage() {
  return (
    <AuthPanel mode="forgot-password" verificationMode="recovery" title="Enter your recovery code."
      description="If an account exists for your address, a six-digit recovery code will arrive. Verify it to choose a new password.">
      <Link href="/forgot-password">Back to password recovery</Link>
      <Link href="/sign-in">Back to sign in</Link>
    </AuthPanel>
  );
}
