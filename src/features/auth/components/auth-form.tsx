"use client";

import { useActionState } from "react";
import {
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
} from "../actions";
import {
  INITIAL_AUTH_STATE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AuthMode,
} from "../validation";
import styles from "./auth.module.css";

const actions = {
  "sign-in": signIn,
  "sign-up": signUp,
  "forgot-password": requestPasswordReset,
  "update-password": updatePassword,
};
const labels = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  "forgot-password": "Send reset link",
  "update-password": "Update password",
};

export function AuthForm({
  mode,
  configured,
}: {
  mode: AuthMode;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(
    actions[mode],
    INITIAL_AUTH_STATE,
  );
  const newPassword = mode === "sign-up" || mode === "update-password";
  return (
    <form action={action} className={styles.form}>
      <fieldset disabled={pending || !configured}>
        <legend className={styles.srOnly}>{labels[mode]}</legend>
        {mode !== "update-password" && (
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>
        )}
        {mode !== "forgot-password" && (
          <div className={styles.field}>
            <label htmlFor="password">
              {newPassword ? "New password" : "Password"}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={newPassword ? "new-password" : "current-password"}
              minLength={newPassword ? PASSWORD_MIN_LENGTH : 1}
              maxLength={PASSWORD_MAX_LENGTH}
              aria-describedby={newPassword ? "password-hint" : undefined}
              required
            />
            {newPassword && (
              <p id="password-hint" className={styles.hint}>
                Use 12–128 characters. A long, unique passphrase works well.
              </p>
            )}
          </div>
        )}
        {newPassword && (
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
            />
          </div>
        )}
        <button className={styles.submit} type="submit">
          {pending ? "Please wait…" : labels[mode]}
        </button>
      </fieldset>
      <div aria-live="polite" aria-atomic="true">
        {state.message && (
          <p
            className={state.status === "error" ? styles.error : styles.message}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
