import "server-only";
import { requireUser } from "@/lib/auth/session.server";
import { createAuthClient } from "@/lib/supabase/server";
import { profileDisplayName } from "./validation";

export async function readOwnDisplayName() {
  const user = await requireUser();
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.from("profiles")
      .select("display_name").eq("id", user.id).maybeSingle();
    return profileDisplayName(error ? null : data?.display_name);
  } catch {
    return profileDisplayName(null);
  }
}
