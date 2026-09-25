"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuthConfig } from "@/lib/auth/config";
import { createAuthClient } from "@/lib/supabase/server";
import { validateAuthInput, validateVerificationInput, type VerificationMode, type AuthState } from "./validation";

const unavailable: AuthState = {
  status: "error",
  message:
    "Account access is temporarily unavailable. Please try again shortly.",
};
const setupRequired: AuthState = {
  status: "error",
  message:
    "Account access is not connected yet. Please finish the project setup first.",
};
const failure = (message: string): AuthState => ({ status: "error", message });

function recordEmailRequest(operation: string, error: { status?: number; code?: string } | null) {
  // Provider acceptance is not delivery confirmation. Never log recipient or tokens.
  const event = {
    operation,
    timestamp: new Date().toISOString(),
    result: error ? "rejected" : "accepted_delivery_unconfirmed",
    status: error?.status,
    code: error?.code,
  };
  const entry = `[auth-email] ${JSON.stringify(event)}`;
  if (error) console.warn(entry);
  else console.info(entry);
}

function emailRequestFailure(error: { status?: number; code?: string }): AuthState {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return failure("The email request limit has been reached. A new code could not be requested. Please try again later.");
  }
  return failure("A new code could not be requested. Email sending may be unavailable. Please try again later.");
}

export async function signIn(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const input = validateAuthInput("sign-in", form);
  if (!input.ok) return failure(input.message);
  if (!getAuthConfig()) return setupRequired;
  try {
    const supabase = await createAuthClient({ writable: true });
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error)
      return failure(
        "Unable to sign in. Check your email and password, confirm your email if needed, or try again later.",
      );
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect("/sessions");
}

export async function signUp(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const input = validateAuthInput("sign-up", form);
  if (!input.ok) return failure(input.message);
  const config = getAuthConfig();
  if (!config) return setupRequired;
  let signedIn = false;
  try {
    const supabase = await createAuthClient({ writable: true });
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });
    recordEmailRequest("signup", error);
    if (error?.status === 429) return emailRequestFailure(error);
    if (error?.code === "weak_password") {
      return failure("This password does not meet the account password policy. Choose a stronger, unique password of 12–128 characters.");
    }
    if (error && (error.status ?? 0) >= 500) {
      return failure("The account service could not complete registration. Please try again later.");
    }
    if (error && error.code !== "user_already_exists")
      return failure(
        "Registration could not be completed. Please check your email address or try again later.",
      );
    signedIn = Boolean(data.session);
  } catch {
    return unavailable;
  }
  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/sessions");
  }
  // UI context only: this email grants no access; Supabase must verify the OTP.
  const cookieStore = await cookies();
  cookieStore.set("arc-track-signup-email", input.email, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.appUrl.startsWith("https:"),
    path: "/",
    maxAge: 3600,
  });
  redirect("/verify-email");
}

export async function requestPasswordReset(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const input = validateAuthInput("forgot-password", form);
  if (!input.ok) return failure(input.message);
  const config = getAuthConfig();
  if (!config) return setupRequired;
  try {
    const supabase = await createAuthClient({ writable: true });
    const { error } = await supabase.auth.resetPasswordForEmail(input.email);
    recordEmailRequest("recovery", error);
    if (error) return emailRequestFailure(error);
  } catch {
    return unavailable;
  }
  redirect("/verify-recovery");
}

// Purpose and destination are fixed by the exported action, never by form input.
async function submitVerification(mode: VerificationMode, form: FormData): Promise<AuthState> {
  const resend = form.get("intent") === "resend";
  const input = validateVerificationInput(form, !resend);
  if (!input.ok) return failure(input.message);
  if (!getAuthConfig()) return setupRequired;
  try {
    const supabase = await createAuthClient({ writable: true });
    if (resend) {
      const { error } = mode === "email"
        ? await supabase.auth.resend({ type: "signup", email: input.email })
        : await supabase.auth.resetPasswordForEmail(input.email);
      recordEmailRequest(mode === "email" ? "signup-resend" : "recovery-resend", error);
      if (error) return emailRequestFailure(error);
      return { status: "success", message: "Code requested. Check your inbox and spam folder for the latest email. If it does not arrive, delivery may be delayed or this address may not be eligible for another code." };
    }
    const { data, error } = await supabase.auth.verifyOtp({
      email: input.email,
      token: input.token,
      type: mode,
    });
    if (error || !data.session || !data.user) {
      return failure(error?.status === 429
        ? "Too many attempts. Please wait before trying again."
        : "This code is incorrect, expired, or already used. Check your email address and latest code, or request a new code.");
    }
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  if (mode === "email") {
    const cookieStore = await cookies();
    cookieStore.delete("arc-track-signup-email");
  }
  redirect(mode === "recovery" ? "/update-password" : "/sessions");
}

export async function verifyEmail(_previous: AuthState, form: FormData): Promise<AuthState> {
  return submitVerification("email", form);
}

export async function verifyRecovery(_previous: AuthState, form: FormData): Promise<AuthState> {
  return submitVerification("recovery", form);
}

export async function updatePassword(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const input = validateAuthInput("update-password", form);
  if (!input.ok) return failure(input.message);
  if (!getAuthConfig()) return setupRequired;
  try {
    const supabase = await createAuthClient({ writable: true });
    const { data, error: identityError } = await supabase.auth.getUser();
    if (identityError || !data.user)
      return failure(
        "Your session has expired. Request a fresh password recovery code.",
      );
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error)
      return failure(
        "The password could not be updated. Use a different password or request a fresh recovery code.",
      );
  } catch {
    return unavailable;
  }
  return {
    status: "success",
    message:
      "Your password has been updated. You can return to your dashboard.",
  };
}

export async function signOut(): Promise<AuthState> {
  if (!getAuthConfig()) redirect("/sign-in");
  try {
    const supabase = await createAuthClient({ writable: true });
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error)
      return failure("Sign-out could not be completed. Please try again.");
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect("/sign-in?status=signed-out");
}
