"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createOrganization, joinOrganization, leaveOrganization, regenerateJoinCode } from "../actions";
import type { OwnOrganization } from "../read.server";
import styles from "./organization.module.css";

export function OrganizationWorkspace({ organizations }: { organizations: OwnOrganization[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null);
    const result = await createOrganization({ name });
    setPending(false);
    if (!result.ok) { setMessage(result.message); return; }
    setName(""); setMessage(`${result.data.name} was created.`); router.refresh();
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null);
    const result = await joinOrganization(code);
    setPending(false);
    if (!result.ok) { setMessage(result.message); return; }
    setCode(""); setMessage(result.data === "already_member" ? "You are already a member." : "You joined as an Archer.");
    router.refresh();
  }

  async function handleLeave(organization: OwnOrganization) {
    if (!window.confirm(`Leave ${organization.name}?`)) return;
    setPending(true); setMessage(null);
    const result = await leaveOrganization(organization.id);
    setPending(false);
    setMessage(result.ok ? `You left ${organization.name}.` : result.message);
    if (result.ok) router.refresh();
  }

  async function handleRegenerate(organization: OwnOrganization) {
    if (!window.confirm(`Regenerate the join code for ${organization.name}? The old code will stop working.`)) return;
    setPending(true); setMessage(null);
    const result = await regenerateJoinCode(organization.id);
    setPending(false);
    setMessage(result.ok ? `New code: ${result.data}` : result.message);
    if (result.ok) router.refresh();
  }

  async function handleCopy(codeToCopy: string) {
    try { await navigator.clipboard.writeText(codeToCopy); setMessage("Join code copied."); }
    catch { setMessage("Select the join code to copy it."); }
  }

  return <div className={styles.workspace}>
    {message && <p role="status" className={styles.message}>{message}</p>}
    <section className={styles.panel}>
      <h2>Your organisations</h2>
      {organizations.length === 0 ? <p>You have not joined an organisation yet.</p> :
        <ul className={styles.organizationList}>{organizations.map((item) => <li key={item.id}>
          <div><strong>{item.name}</strong><span>{item.role === "head_coach" ? "Head Coach" : "Archer"} · Active</span></div>
          {item.role === "head_coach" && item.joinCode && <div className={styles.joinCode}>
            <label><span>Join code</span><input readOnly value={item.joinCode} onFocus={(event) => event.target.select()}/></label>
            <button type="button" onClick={() => handleCopy(item.joinCode!)}>Copy</button>
            <button type="button" disabled={pending} onClick={() => handleRegenerate(item)}>Regenerate</button>
          </div>}
          <div className={styles.organizationActions}>
            {item.role === "head_coach" && <Link href={`/organization/${item.id}`}>Coach Dashboard</Link>}
            <button type="button" disabled={pending} onClick={() => handleLeave(item)}>Leave</button>
          </div>
        </li>)}</ul>}
    </section>
    <section className={styles.panel}>
      <h2>Join an organisation</h2>
      <form className={styles.form} onSubmit={handleJoin}>
        <label><span>Join code</span><input required maxLength={16} autoCapitalize="characters" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} placeholder="AB7K4M2Q"/></label>
        <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Joining…" : "Join"}</button>
      </form>
    </section>
    <section className={styles.panel}>
      <h2>Create an organisation</h2>
      <p>You become its first Head Coach.</p>
      <form className={styles.form} onSubmit={handleCreate}>
        <label><span>Organisation name</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Club or team name"/></label>
        <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Saving…" : "Create organisation"}</button>
      </form>
    </section>
  </div>;
}
