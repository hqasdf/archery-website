export type RecoveryStage = "verify" | "password";
export type RecoveryContext = { active: true; email: string; stage: RecoveryStage; userId?: string };
export type SignupContext = { email: string; stage: "verify" };

export const RECOVERY_STORAGE_KEY = "arc-track:recovery:v1";
export const SIGNUP_STORAGE_KEY = "arc-track:signup:v1";

export function isMissingOrInvalidSession(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const issue = error as { code?: unknown; name?: unknown };
  return issue.name === "AuthSessionMissingError" || [
    "session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "user_not_found",
  ].includes(String(issue.code ?? ""));
}

export function serializeRecoveryContext(context: RecoveryContext): string {
  return JSON.stringify({ active: true, email: context.email.trim(), stage: context.stage, ...(context.userId ? { userId: context.userId } : {}) });
}

export function serializeSignupContext(email: string): string {
  return JSON.stringify({ email: email.trim(), stage: "verify" });
}

const validEmail = (email: unknown): email is string =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email === email.trim();

export function parseRecoveryContext(raw: string | null): RecoveryContext | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const context = value as Record<string, unknown>;
    return context.active === true && validEmail(context.email) && (context.stage === "verify" || context.stage === "password")
      && (context.userId === undefined || (typeof context.userId === "string" && context.userId.length > 0))
      ? { active: true, email: context.email, stage: context.stage, ...(context.userId ? { userId: context.userId } : {}) } : null;
  } catch { return null; }
}

export function parseSignupContext(raw: string | null): SignupContext | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const context = value as Record<string, unknown>;
    return validEmail(context.email) && context.stage === "verify" ? { email: context.email, stage: "verify" } : null;
  } catch { return null; }
}

export function recoveryBlocksApp(user: { id: string } | null, context: RecoveryContext | null): boolean {
  return !!user && context?.active === true && context.stage === "password" && (!context.userId || context.userId === user.id);
}

export function authDestination(user: { id: string } | null, context: RecoveryContext | null): "sign-in" | "recover" | "sessions" {
  if (!user) return "sign-in";
  return recoveryBlocksApp(user, context) ? "recover" : "sessions";
}

export async function completeRecovery(updatePassword: () => Promise<void>, clearPending: () => Promise<void>): Promise<void> {
  await updatePassword();
  await clearPending();
}

export async function cancelRecovery(context: RecoveryContext | null, hasSession: boolean, signOut: () => Promise<void>, clearPending: () => Promise<void>): Promise<void> {
  if (context?.stage === "password" && hasSession) await signOut();
  await clearPending();
}

export function safeAuthMessage(error: unknown, context: "sign-in" | "otp" | "request" | "password" | "sign-out" = "sign-in"): string {
  const issue = typeof error === "object" && error !== null ? error as { code?: unknown; status?: unknown; name?: unknown; message?: unknown } : {};
  const code = typeof issue.code === "string" ? issue.code : "";
  const message = typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  if (issue.status === 429 || code.includes("rate_limit") || code.startsWith("over_"))
    return "Too many attempts. Please wait and try again.";
  if (issue.name === "AuthRetryableFetchError" || issue.name === "TypeError" || /failed to fetch|network request failed|network error|fetch failed|timeout/.test(message) || (typeof issue.status === "number" && issue.status >= 500))
    return "Unable to connect. Check your internet connection and try again.";
  if (context === "otp" && (code === "otp_expired" || code === "invalid_grant" || code === "otp_disabled" || /expired|invalid.*(otp|token|code)/.test(message)))
    return "The code is invalid or expired. Request a new code and try again.";
  if (context === "sign-in" && (code === "invalid_credentials" || /invalid login credentials/.test(message)))
    return "Email or password is incorrect.";
  return "Something went wrong. Please try again.";
}
