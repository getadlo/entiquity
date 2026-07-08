import { redirect } from "next/navigation";
import AppShell from "@/components/shell";
import { getSession } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.membership) redirect("/onboarding");
  if (session.membership.role === "client") redirect("/portal");
  const org: any = session.membership.organizations;
  return (
    <AppShell orgName={org?.name ?? "Workspace"} userEmail={session.user.email ?? ""} role={session.membership.role}>
      {children}
    </AppShell>
  );
}
