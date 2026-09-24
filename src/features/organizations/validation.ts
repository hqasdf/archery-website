export type OrganizationRole = "archer" | "head_coach";
export type CreateOrganizationInput = { name: string };

export function validateOrganizationName(input: CreateOrganizationInput) {
  const name = input.name.trim();
  if (!name || Array.from(name).length > 120)
    return { ok: false as const, message: "Enter an organisation name of up to 120 characters." };
  return { ok: true as const, name };
}

export function normalizeJoinCode(input: string) {
  const code = input.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}
