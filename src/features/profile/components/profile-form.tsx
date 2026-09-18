"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "../actions";
import {
  DIVISIONS, SHOOTING_HANDS, EXPERIENCE_LEVELS, profileDisplayName,
  INITIAL_PROFILE_STATE, type ProfileDetails, type ProfileState,
} from "../validation";
import styles from "./profile.module.css";

export function ProfileForm({ profile }: { profile: ProfileDetails }) {
  const [saved, setSaved] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <section className={styles.card} aria-labelledby="archer-profile-heading">
      <h2 id="archer-profile-heading">Archer profile</h2>
      {editing ? (
        <ProfileEditor profile={saved} onCancel={() => setEditing(false)} onSaved={(next) => {
          setSaved(next);
          setEditing(false);
          setNotice("Profile saved.");
        }} />
      ) : (
        <>
          <p className={styles.displayName}>{profileDisplayName(saved.display_name)}</p>
          <dl className={styles.details}>
            {([
              ["club_or_team", "Club / Team"], ["division", "Division"],
              ["shooting_hand", "Shooting hand"], ["experience_level", "Experience level"],
            ] as const).map(([field, label]) => (
              <div key={field}><dt>{label}</dt><dd>{saved[field] || "Not specified"}</dd></div>
            ))}
          </dl>
          <button type="button" className={styles.secondary} onClick={() => {
            setNotice("");
            setEditing(true);
          }}>Edit profile</button>
        </>
      )}
      <div aria-live="polite">{notice && <p className={styles.success} role="status">{notice}</p>}</div>
    </section>
  );
}

function ProfileEditor({ profile, onCancel, onSaved }: {
  profile: ProfileDetails;
  onCancel: () => void;
  onSaved: (profile: ProfileDetails) => void;
}) {
  const [values, setValues] = useState(profile);
  const [state, action, pending] = useActionState(
    async (previous: ProfileState, form: FormData) => {
      const result = await saveProfile(previous, form);
      if (result.status === "success" && result.profile) onSaved(result.profile);
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
        <legend className={styles.legend}>Edit your details</legend>
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
          ["division", "Division", DIVISIONS], ["shooting_hand", "Shooting hand", SHOOTING_HANDS],
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
        <div className={styles.buttons}>
          <button type="submit" className={styles.save}>{pending ? "Saving…" : "Save changes"}</button>
          <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
      <div aria-live="polite" aria-atomic="true">
        {state.status === "error" && <p className={styles.error} role="alert">{state.message}</p>}
      </div>
    </form>
  );
}
