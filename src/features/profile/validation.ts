export const DIVISIONS = ["Recurve", "Compound", "Barebow", "Other"] as const;
export const SHOOTING_HANDS = ["Left", "Right"] as const;
export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type ProfileDetails = {
  display_name: string | null;
  club_or_team: string | null;
  division: string | null;
  shooting_hand: string | null;
  experience_level: string | null;
};

export type ProfileState = {
  status: "idle" | "error" | "success";
  message: string;
  profile?: ProfileDetails;
};

export const INITIAL_PROFILE_STATE: ProfileState = { status: "idle", message: "" };
export const DISPLAY_NAME_MAX_LENGTH = 80;

export function profileDisplayName(name: string | null | undefined) {
  return name?.trim() || "Archer";
}

export function validateProfileInput(form: FormData) {
  const profile: ProfileDetails = {
    display_name: null, club_or_team: null, division: null,
    shooting_hand: null, experience_level: null,
  };
  const textFields = [
    ["display_name", "display name", DISPLAY_NAME_MAX_LENGTH],
    ["club_or_team", "club / team", 120],
  ] as const;
  for (const [field, label, limit] of textFields) {
    const raw = form.get(field);
    if (typeof raw !== "string") {
      return { ok: false as const, message: `Enter your ${label}, or leave it blank.` };
    }
    const value = raw.trim();
    if (value.includes("\0") || /[\uD800-\uDFFF]/u.test(value)) {
      return { ok: false as const, message: `Your ${label} contains an unsupported character.` };
    }
    // Match PostgreSQL char_length, including supplementary Unicode characters.
    if (Array.from(value).length > limit) {
      return { ok: false as const, message: `Use no more than ${limit} characters for your ${label}.` };
    }
    profile[field] = value || null;
  }
  const choices = [
    ["division", "division", DIVISIONS],
    ["shooting_hand", "shooting hand", SHOOTING_HANDS],
    ["experience_level", "experience level", EXPERIENCE_LEVELS],
  ] as const;
  for (const [field, label, options] of choices) {
    const raw = form.get(field);
    if (typeof raw !== "string" || (raw !== "" && !(options as readonly string[]).includes(raw))) {
      return { ok: false as const, message: `Choose a valid ${label}, or select Not specified.` };
    }
    profile[field] = raw || null;
  }
  return { ok: true as const, profile };
}
