"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "../actions";
import { INITIAL_PROFILE_STATE, type ProfileState } from "../validation";
import styles from "./profile.module.css";

export function ProfileForm({ email, displayName }: { email: string; displayName: string | null }) {
  const [name, setName] = useState(displayName ?? "");
  const [state, action, pending] = useActionState(
    async (previous: ProfileState, form: FormData) => {
      const result = await saveProfile(previous, form);
      if (result.status === "success") setName(result.displayName ?? "");
      return result;
    },
    INITIAL_PROFILE_STATE,
  );

  return (
    <form action={action} className={styles.form}>
      <fieldset disabled={pending}>
        <legend className={styles.legend}>Your details</legend>
        <div className={styles.field}>
          <label htmlFor="profile-email">Email address</label>
          <input id="profile-email" type="email" value={email} readOnly aria-describedby="email-note" />
          <p id="email-note" className={styles.hint}>Your sign-in email is read-only here.</p>
        </div>
        <div className={styles.field}>
          <label htmlFor="display-name">Display name</label>
          <input id="display-name" name="display_name" type="text" autoComplete="nickname"
            value={name} onChange={(event) => setName(event.target.value)} aria-describedby="name-note" />
          <p id="name-note" className={styles.hint}>Optional. Up to 80 characters.</p>
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
