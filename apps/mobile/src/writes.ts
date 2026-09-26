import { supabase } from "./supabase";
import {
  buildSessionInsertPayload,
  mapSessionInsertResult,
  mapRoundCreationResult,
  type NewMobileSessionInput,
} from "./session-write-model";
import type { MobileSession } from "./sessions";
import { buildRoundRpcArgs, configFromPreset, type RoundConfig } from "./round-config";
import { buildRoundUpdateArgs, mapRoundUpdateResult, type RoundSettingsInput } from "./round-update-model";

export async function createMobileSession(userId: string, input: NewMobileSessionInput): Promise<MobileSession> {
  if (!supabase) throw new Error("Arc Track could not connect to Supabase. Check your connection and try again.");
  const payload = buildSessionInsertPayload(userId, input);
  const { data, error } = await supabase.from("sessions")
    .insert(payload)
    .select("id,title,session_date,session_type,arrow_count")
    .single();
  return mapSessionInsertResult(data, !!error);
}

export async function createMobileRound(sessionId: string, config: RoundConfig = configFromPreset()) {
  if (!supabase) throw new Error("Arc Track could not connect to Supabase. Check your connection and try again.");
  const { data, error } = await supabase.rpc("create_round_with_ends", buildRoundRpcArgs(sessionId, config)).single();
  return mapRoundCreationResult(data, !!error);
}

export const roundUpdateEnabled = process.env.EXPO_PUBLIC_ROUND_UPDATE_ENABLED === "true";

export async function updateMobileRoundSettings(roundId: string, previousEnds: number, input: RoundSettingsInput) {
  if (!roundUpdateEnabled) throw new Error("Round configuration is waiting for its backend update to be enabled.");
  if (!supabase) throw new Error("Round configuration is unavailable.");
  const { data, error } = await supabase.rpc("update_owned_round_settings", buildRoundUpdateArgs(roundId, previousEnds, input)).single();
  return mapRoundUpdateResult(roundId, input.plannedEnds, data, error);
}

export async function saveMobileSessionArrowCount(userId: string, sessionId: string, count: number) {
  if (!supabase) throw new Error("Session saving is unavailable.");
  if (!Number.isInteger(count) || count < 0 || count > 2147483647) throw new Error("Arrow count must be a non-negative whole number.");
  const { data, error } = await supabase.from("sessions").update({ arrow_count: count })
    .eq("id", sessionId).eq("user_id", userId).select("arrow_count").maybeSingle();
  if (error || !data) throw new Error("The Session Arrow count could not be saved.");
  return data.arrow_count;
}

export async function deleteMobileSession(userId: string, sessionId: string) {
  if (!supabase) throw new Error("Session deletion is unavailable.");
  const { data, error } = await supabase.from("sessions").delete()
    .eq("id", sessionId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) throw new Error("The Session could not be deleted.");
}

export async function deleteMobileRound(sessionId: string, roundId: string) {
  if (!supabase) throw new Error("Round deletion is unavailable.");
  const { data, error } = await supabase.from("session_rounds").delete()
    .eq("id", roundId).eq("session_id", sessionId).select("id").maybeSingle();
  if (error || !data) throw new Error("The Round could not be deleted.");
}
