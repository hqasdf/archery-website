"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session.server";
import { getAuthConfig } from "@/lib/auth/config";
import { createAuthClient } from "@/lib/supabase/server";
import { validateEmailChange, type EmailChangeState } from "./email-validation";

export async function requestEmailChange(_previous: EmailChangeState, form: FormData): Promise<EmailChangeState> {
  const user = await requireUser();
  const input = validateEmailChange(form, user.email ?? "");
  if (!input.ok) return { status: "error", message: input.message };
  const config = getAuthConfig();
  if (!config) return { status: "error", message: "Account access is temporarily unavailable." };
  try {
    const supabase = await createAuthClient({ writable: true });
    const { error } = await supabase.auth.updateUser(
      { email: input.email },
      { emailRedirectTo: `${config.appUrl}/auth/callback` },
    );
    if (error) {
      return { status: "error", message: error.status === 429
        ? "Too many requests. Please wait before requesting another email change."
        : "The email change could not be requested. Check the address or try again later." };
    }
    revalidatePath("/profile");
    return { status: "success", message: "Check both your current and new email inboxes to confirm the address change. Your current email remains active until confirmation is complete. Open the confirmation links in this browser." };
  } catch {
    return { status: "error", message: "The email change could not be requested. Please try again later." };
  }
}
