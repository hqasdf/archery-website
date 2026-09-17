import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { createAuthClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/features/profile/components/profile-form";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  let profile: { display_name: string | null } | null = null;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.from("profiles")
      .select("display_name").eq("id", user.id).maybeSingle();
    if (!error) profile = data;
  } catch {
    // Keep provider details private; preserve navigation so the user can retry.
  }

  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Your account</p>
        <h1>Your profile.</h1>
        <p>A name for your archery journal.</p>
      </div>
      {profile ? <ProfileForm email={user.email ?? ""} displayName={profile.display_name} /> : (
        <p role="alert">Your profile could not be loaded. Please refresh the page to try again.</p>
      )}
    </>
  );
}
