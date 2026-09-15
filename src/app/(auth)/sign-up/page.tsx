import Link from "next/link";
import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/components/auth-panel";

export const metadata: Metadata = { title: "Create account" };
export default function SignUpPage() {
  return (
    <AuthPanel
      mode="sign-up"
      title="Make room for your progress."
      description="Create your account with an email address and a password."
    >
      <Link href="/sign-in">Already have an account? Sign in</Link>
    </AuthPanel>
  );
}
