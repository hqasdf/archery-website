"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session.server";
import { createAuthClient } from "@/lib/supabase/server";
import { validateProfileInput, type ProfileState } from "./validation";

export async function saveProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const input = validateProfileInput(form);
  if (!input.ok) return { status: "error", message: input.message };

  try {
    const supabase = await createAuthClient({ writable: true });
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: input.displayName })
      .eq("id", user.id)
      .select("id, display_name")
      .maybeSingle();
    if (error || !data) {
      return { status: "error", message: "Your profile could not be saved. Please try again." };
    }
    revalidatePath("/profile");
    return { status: "success", message: "Profile saved.", displayName: data.display_name };
  } catch {
    return { status: "error", message: "Profile saving is temporarily unavailable. Please try again." };
  }
}
