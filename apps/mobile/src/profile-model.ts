export const DIVISIONS = ["Recurve", "Compound", "Barebow", "Other"] as const;
export const SHOOTING_HANDS = ["Left", "Right"] as const;
export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type MobileProfile = {
  display_name: string | null; club_or_team: string | null; division: string | null;
  shooting_hand: string | null; experience_level: string | null;
};
export const EMPTY_PROFILE: MobileProfile = {
  display_name: null, club_or_team: null, division: null, shooting_hand: null, experience_level: null,
};
export function validateMobileProfile(input: MobileProfile): MobileProfile {
  const result = { ...input };
  for (const [field, max] of [["display_name", 80], ["club_or_team", 120]] as const) {
    const value = result[field]?.trim() || null;
    if (value && (Array.from(value).length > max || value.includes("\0") || /[\uD800-\uDFFF]/u.test(value)))
      throw new Error(`${field === "display_name" ? "Display name" : "Club / Team"} contains invalid text or is too long.`);
    result[field] = value;
  }
  for (const [field, values] of [["division", DIVISIONS], ["shooting_hand", SHOOTING_HANDS], ["experience_level", EXPERIENCE_LEVELS]] as const) {
    if (result[field] && !(values as readonly string[]).includes(result[field])) throw new Error("Choose a valid profile option.");
  }
  return result;
}
