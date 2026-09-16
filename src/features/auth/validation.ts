export type AuthMode =
  "sign-in" | "sign-up" | "forgot-password" | "update-password";
export type AuthState = {
  status: "idle" | "error" | "success";
  message: string;
};
export const INITIAL_AUTH_STATE: AuthState = { status: "idle", message: "" };
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export type VerificationMode = "email" | "recovery";

export function validateVerificationInput(form: FormData, requireCode = true) {
  const input = validateAuthInput("forgot-password", form);
  if (!input.ok) return input;
  const token = textField(form, "code").trim();
  if (requireCode && !/^[0-9]{6}$/.test(token)) {
    return { ok: false as const, message: "Enter the six-digit code from your email." };
  }
  return { ok: true as const, email: input.email, token };
}

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function validateAuthInput(mode: AuthMode, form: FormData) {
  const email = textField(form, "email").trim();
  const password = textField(form, "password");
  if (
    mode !== "update-password" &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return { ok: false as const, message: "Enter a valid email address." };
  }
  if (
    mode === "sign-in" &&
    (!password || password.length > PASSWORD_MAX_LENGTH)
  ) {
    return {
      ok: false as const,
      message: "Enter your password (up to 128 characters).",
    };
  }
  if (mode === "sign-up" || mode === "update-password") {
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      return {
        ok: false as const,
        message: "Choose a password between 12 and 128 characters.",
      };
    }
    if (password !== textField(form, "confirmPassword")) {
      return { ok: false as const, message: "The passwords do not match." };
    }
  }
  return { ok: true as const, email, password };
}
