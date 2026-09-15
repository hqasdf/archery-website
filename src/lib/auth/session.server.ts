import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthConfig } from "./config";
import { createAuthClient } from "@/lib/supabase/server";

// React cache deduplicates checks within a render, not across users/requests.
export const readIdentity = cache(async () => {
  if (!getAuthConfig()) return { user: null, unavailable: false };
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.getUser();
    return {
      user: error ? null : data.user,
      unavailable: Boolean(error && error.status && error.status >= 500),
    };
  } catch {
    return { user: null, unavailable: true };
  }
});

export async function requireUser() {
  if (!getAuthConfig()) redirect("/sign-in");
  const { user, unavailable } = await readIdentity();
  if (!user) redirect(unavailable ? "/sign-in?status=unavailable" : "/sign-in");
  return user;
}
