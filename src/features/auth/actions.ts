"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthConfig } from "@/lib/auth/config";
import { createAuthClient } from "@/lib/supabase/server";
import { validateAuthInput, type AuthState } from "./validation";

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
  redirect("/dashboard");
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
      options: { emailRedirectTo: `${config.appUrl}/auth/callback` },
    });
    if (error && error.code !== "user_already_exists")
      return failure(
        "Unable to complete registration. Check the password requirements or try again later.",
      );
    signedIn = Boolean(data.session);
  } catch {
    return unavailable;
  }
  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  return {
    status: "success",
    message:
      "Check your inbox for a confirmation link if registration is available for this address. Already registered? Sign in or reset your password. Open the email link in this same browser.",
  };
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
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${config.appUrl}/auth/callback?next=/update-password`,
    });
    if (error)
      return failure(
        "Unable to request a reset right now. Please wait a little and try again.",
      );
  } catch {
    return unavailable;
  }
  return {
    status: "success",
    message:
      "If an account exists for this address, a password reset link will arrive by email. Open it in this same browser.",
  };
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
        "Your session has expired. Request a fresh password reset link.",
      );
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error)
      return failure(
        "The password could not be updated. Use a different password or request a fresh reset link.",
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
