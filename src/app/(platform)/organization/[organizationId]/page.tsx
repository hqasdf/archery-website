import type { Metadata } from "next";
import { CoachDashboard } from "@/features/organizations/components/coach-dashboard";
import { readCoachAthletes, readCoachOrganizationSessions, requireCoachOrganization } from "@/features/organizations/coach-read.server";
import { singaporeToday } from "@/features/organizations/coach-model";

export const metadata: Metadata = { title: "Coach Dashboard" };

export default async function CoachDashboardPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const organization = await requireCoachOrganization(organizationId);
  const [athletes, sessions] = await Promise.all([
    readCoachAthletes(organizationId), readCoachOrganizationSessions(organizationId),
  ]);
  const today = singaporeToday(new Date());
  return <CoachDashboard organization={organization} athletes={athletes} sessions={sessions} today={today}/>;
}
