import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session.server";
import { createAuthClient } from "@/lib/supabase/server";
import { mapSession, SESSION_DETAIL_SELECT, type DbSession } from "@/features/sessions/read.server";
import type { SessionDraft } from "@/features/sessions/scoring-model";
import type { CoachAthlete } from "./coach-model";

export type CoachSession = SessionDraft & { userId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COACH_SESSION_SELECT = `user_id,${SESSION_DETAIL_SELECT}`;

function mapCoachSession(row: DbSession & { user_id: string }): CoachSession {
  return { ...mapSession(row), userId: row.user_id };
}

export const requireCoachOrganization = cache(async (organizationId: string) => {
  if (!UUID.test(organizationId)) notFound();
  const user = await requireUser();
  const supabase = await createAuthClient();
  const { data, error } = await supabase.from("organization_members")
    .select("organization_id,organizations(name)")
    .eq("organization_id", organizationId).eq("user_id", user.id)
    .eq("role", "head_coach").eq("status", "active").maybeSingle();
  if (error) throw new Error("Coach access could not be checked.");
  if (!data?.organizations) notFound();
  const organization = data.organizations as unknown as { name: string };
  return { id: organizationId, name: organization.name };
});

export const readCoachAthletes = cache(async (organizationId: string): Promise<CoachAthlete[]> => {
  await requireCoachOrganization(organizationId);
  const supabase = await createAuthClient();
  const { data, error } = await supabase.rpc("read_coach_athlete_roster", { p_organization_id: organizationId });
  if (error) throw new Error("Athlete roster could not be loaded.");
  return (data ?? []).map((row: {
    user_id: string; display_name: string | null; joined_at: string;
  }) => ({ userId: row.user_id, displayName: row.display_name,
    joinedAt: row.joined_at }));
});

export async function readCoachOrganizationSessions(organizationId: string): Promise<CoachSession[]> {
  const athletes = await readCoachAthletes(organizationId);
  if (athletes.length === 0) return [];
  const supabase = await createAuthClient();
  const { data, error } = await supabase.from("sessions").select(COACH_SESSION_SELECT)
    .in("user_id", athletes.map((athlete) => athlete.userId))
    .order("session_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("Organisation Sessions could not be loaded.");
  return ((data ?? []) as unknown as (DbSession & { user_id: string })[]).map(mapCoachSession);
}

export async function readCoachAthleteSessions(organizationId: string, athleteId: string): Promise<CoachSession[]> {
  if (!UUID.test(athleteId)) notFound();
  const athletes = await readCoachAthletes(organizationId);
  if (!athletes.some((athlete) => athlete.userId === athleteId)) notFound();
  const supabase = await createAuthClient();
  const { data, error } = await supabase.from("sessions").select(COACH_SESSION_SELECT)
    .eq("user_id", athleteId)
    .order("session_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("Athlete Sessions could not be loaded.");
  return ((data ?? []) as unknown as (DbSession & { user_id: string })[]).map(mapCoachSession);
}
