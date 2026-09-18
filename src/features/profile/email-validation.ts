export type EmailChangeState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const INITIAL_EMAIL_CHANGE_STATE: EmailChangeState = { status: "idle", message: "" };

export function validateEmailChange(form: FormData, currentEmail: string) {
  const raw = form.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";
  if (email.length > 254 || /[\u0000-\u001F\u007F]/.test(email)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, message: "Enter a valid email address." };
  }
  if (email.toLowerCase() === currentEmail.trim().toLowerCase()) {
    return { ok: false as const, message: "Enter an email address different from your current email." };
  }
  return { ok: true as const, email };
}
