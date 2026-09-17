export type ProfileState = {
  status: "idle" | "error" | "success";
  message: string;
  displayName?: string | null;
};

export const INITIAL_PROFILE_STATE: ProfileState = { status: "idle", message: "" };
export const DISPLAY_NAME_MAX_LENGTH = 80;

export function validateProfileInput(form: FormData) {
  const raw = form.get("display_name");
  if (typeof raw !== "string") {
    return { ok: false as const, message: "Enter a display name, or leave it blank." };
  }
  const name = raw.trim();
  // PostgreSQL char_length counts Unicode code points, not UTF-16 code units.
  if (Array.from(name).length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false as const, message: "Use no more than 80 characters for your display name." };
  }
  if (name.includes("\0")) {
    return { ok: false as const, message: "Your display name contains an unsupported character." };
  }
  return { ok: true as const, displayName: name || null };
}
