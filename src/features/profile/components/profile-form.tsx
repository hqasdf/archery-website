"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProfile } from "../actions";
import {
  DIVISIONS, SHOOTING_HANDS, EXPERIENCE_LEVELS,
  INITIAL_PROFILE_STATE, type ProfileDetails, type ProfileState,
} from "../validation";
import styles from "./profile.module.css";

export function ProfileForm({ email, profile }: { email: string; profile: ProfileDetails }) {
  const [values, setValues] = useState(profile);
  const [state, action, pending] = useActionState(
    async (previous: ProfileState, form: FormData) => {
      const result = await saveProfile(previous, form);
      if (result.status === "success" && result.profile) setValues(result.profile);
      return result;
    },
    INITIAL_PROFILE_STATE,
  );
  function change(field: keyof ProfileDetails, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <form action={action} className={styles.form}>
      <fieldset disabled={pending}>
        <legend className={styles.legend}>Account</legend>
        <div className={styles.field}>
          <label htmlFor="profile-email">Email address</label>
          <input id="profile-email" type="email" value={email} readOnly aria-describedby="email-note" />
          <p id="email-note" className={styles.hint}>Your sign-in email is read-only here.</p>
        </div>
        <Link href="/update-password" className={styles.passwordLink}>Change password</Link>
      </fieldset>
      <fieldset disabled={pending} className={styles.archer}>
        <legend className={styles.legend}>Archer profile</legend>
        <div className={styles.field}>
          <label htmlFor="display-name">Display name</label>
          <input id="display-name" name="display_name" type="text" autoComplete="nickname"
            value={values.display_name ?? ""} onChange={(event) => change("display_name", event.target.value)}
            aria-describedby="name-note" />
          <p id="name-note" className={styles.hint}>Optional. Up to 80 characters.</p>
        </div>
        <div className={styles.field}>
          <label htmlFor="club-or-team">Club / Team</label>
          <input id="club-or-team" name="club_or_team" type="text"
            value={values.club_or_team ?? ""} onChange={(event) => change("club_or_team", event.target.value)}
            aria-describedby="club-note" />
          <p id="club-note" className={styles.hint}>Optional. Up to 120 characters.</p>
        </div>
        {([
          ["division", "Division", DIVISIONS],
          ["shooting_hand", "Shooting hand", SHOOTING_HANDS],
          ["experience_level", "Experience level", EXPERIENCE_LEVELS],
        ] as const).map(([field, label, options]) => (
          <div className={styles.field} key={field}>
            <label htmlFor={field}>{label}</label>
            <select id={field} name={field} value={values[field] ?? ""}
              onChange={(event) => change(field, event.target.value)}>
              <option value="">Not specified</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        ))}
        <div className={styles.field}>
          <label htmlFor="profile-bio">Bio</label>
          <textarea id="profile-bio" name="bio" rows={5} value={values.bio ?? ""}
            onChange={(event) => change("bio", event.target.value)} aria-describedby="bio-note" />
          <p id="bio-note" className={styles.hint}>Optional. Up to 500 characters. Your profile is private.</p>
        </div>
        <button type="submit" className={styles.save}>{pending ? "Saving…" : "Save profile"}</button>
      </fieldset>
      <div aria-live="polite" aria-atomic="true">
        {state.message && <p className={state.status === "error" ? styles.error : styles.success}
          role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      </div>
    </form>
  );
}
