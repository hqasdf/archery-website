import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session.server";
import { OrganizationWorkspace } from "@/features/organizations/components/organization-workspace";
import { readOwnOrganizations } from "@/features/organizations/read.server";
import styles from "@/styles/pages.module.css";

export const metadata: Metadata = { title: "Organisation" };

export default async function OrganizationPage() {
  await requireUser();
  const organizations = await readOwnOrganizations();
  return <>
    <div className={styles.intro}>
      <p className={styles.eyebrow}>Your team</p>
      <h1>Organisation</h1>
      <p>Join a team with a code or manage your memberships.</p>
    </div>
    <OrganizationWorkspace organizations={organizations}/>
  </>;
}
