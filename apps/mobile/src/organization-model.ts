export type OwnOrganization = { id: string; name: string; role: "archer" | "head_coach"; joinCode: string | null };
export type CoachAthlete = { userId: string; displayName: string | null; joinedAt: string };
export function normalizeJoinCode(input: string) {
  const code = input.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}
export function mapOwnOrganizations(rows: Array<{ organization_id: string; role: string; organizations: { name: string } | null }>): OwnOrganization[] {
  return rows.flatMap((row) => row.organizations && (row.role === "archer" || row.role === "head_coach")
    ? [{ id: row.organization_id, name: row.organizations.name, role: row.role, joinCode: null }] : []);
}
export function mapCoachRoster(rows: Array<{ user_id: string; display_name: string | null; joined_at: string }>): CoachAthlete[] {
  return rows.map((row) => ({ userId: row.user_id, displayName: row.display_name, joinedAt: row.joined_at }));
}
export function athleteLabel(athlete: CoachAthlete) {
  return athlete.displayName?.trim() || `Archer ${athlete.userId.slice(0, 8)}`;
}
