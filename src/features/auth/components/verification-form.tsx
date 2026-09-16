"use client";

import { useActionState, useState } from "react";
import { verifyEmail, verifyRecovery } from "../actions";
import { INITIAL_AUTH_STATE, type VerificationMode } from "../validation";
import styles from "./auth.module.css";

export function VerificationForm({ mode, configured, initialEmail }: { mode: VerificationMode; configured: boolean; initialEmail?: string }) {
  const [state, action, pending] = useActionState(
    mode === "email" ? verifyEmail : verifyRecovery,
    INITIAL_AUTH_STATE,
  );
  // Keep input on errors/resends without putting the email or code in a URL/storage.
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  return (
    <form action={action} className={styles.form}>
      <fieldset disabled={pending || !configured}>
        <legend className={styles.srOnly}>Verify your email code</legend>
        {initialEmail ? (
          <>
            <input type="hidden" name="email" value={initialEmail} />
            <p className={styles.message}>Enter the code sent to {initialEmail}.</p>
          </>
        ) : <div className={styles.field}>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254}
            value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>}
        <div className={styles.field}>
          <label htmlFor="code">Six-digit code</label>
          <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} minLength={6} required aria-describedby="code-hint"
            value={code} onChange={(event) => setCode(event.target.value)} />
          <p id="code-hint" className={styles.hint}>
            Enter the code within five minutes of requesting it. You can read your email on any device.
          </p>
        </div>
        <button className={styles.submit} type="submit" name="intent" value="verify">
          {pending ? "Please wait…" : "Verify code"}
        </button>
        <button className={styles.submit} type="submit" name="intent" value="resend" formNoValidate>
          Request a new code
        </button>
        <p className={styles.hint}>Wait at least a minute between requests. Email sending limits may apply.</p>
      </fieldset>
      <div aria-live="polite" aria-atomic="true">
        {state.message && <p className={state.status === "error" ? styles.error : styles.message}
          role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      </div>
    </form>
  );
}
