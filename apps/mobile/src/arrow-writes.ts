import type { ArrowEntry } from "@arc-track/core/scoring";
import { arrowWriteFields } from "./arrow-write-model";
import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Arc Track could not connect to Supabase.");
  return supabase;
}

export async function readRoundEndIds(roundId: string): Promise<Map<number, string>> {
  const { data, error } = await client().from("session_ends")
    .select("id,end_number")
    .eq("session_round_id", roundId)
    .order("end_number");
  if (error) throw new Error("The planned Ends could not be loaded. Check your connection and try again.");
  return new Map((data ?? []).map((row) => [row.end_number, row.id]));
}

export async function saveArrowRecord(entry: ArrowEntry, endId: string, savedId?: string): Promise<string> {
  const fields = arrowWriteFields(entry);
  if (savedId) {
    const { data, error } = await client().from("arrows")
      .update(fields)
      .eq("id", savedId)
      .eq("session_end_id", endId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("The Arrow could not be saved. Select it and retry.");
    return data.id;
  }
  const { data, error } = await client().from("arrows")
    .insert({ session_end_id: endId, arrow_number: entry.arrow, ...fields })
    .select("id")
    .single();
  if (error || !data) throw new Error("The Arrow could not be saved. Select it and retry.");
  return data.id;
}

export async function deleteArrowRecord(savedId: string, endId: string): Promise<void> {
  const { data, error } = await client().from("arrows")
    .delete()
    .eq("id", savedId)
    .eq("session_end_id", endId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("The Arrow could not be deleted. Try again.");
}
