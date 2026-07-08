import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLES = ["admin", "attorney", "paralegal", "viewer"] as const;

const ROLE_DESCRIPTIONS: [string, string][] = [
  ["Owner", "Full access to billing, users, entities, documents, AI, and settings. Can transfer ownership."],
  ["Admin", "Full operational access — everything except ownership transfer."],
  ["Attorney", "Create and edit entities, documents, resolutions, and tasks."],
  ["Paralegal", "Create and edit assigned entities, documents, and tasks."],
  ["Viewer", "Read-only access to the workspace."],
  ["Client", "Client portal only — sees shared entities and documents, nothing else."],
];

export default async function SettingsPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const myRole = session!.membership!.role;
  const isAdmin = ["owner", "admin"].includes(myRole);
  const supabase = createClient();

  const [{ data: org }, { data: members }, { data: invites }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase.from("memberships").select("id, role, created_at, users(id, email, full_name)").eq("organization_id", orgId).order("created_at"),
    supabase.from("invitations").select("id, email, role, created_at").eq("organization_id", orgId).is("accepted_at", null),
  ]);

  async function saveOrg(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const g = (k: string) => (formData.get(k) as string)?.trim() || null;
    await sb.from("organizations").update({
      name: g("name"), address: g("address"), billing_email: g("billing_email"),
      default_reminder_days: g("reminders")?.split(",").map((n) => parseInt(n.trim())).filter((n) => !isNaN(n)) ?? [30, 14, 7, 1],
    }).eq("id", s.membership.organization_id);
    redirect("/settings");
  }

  async function invite(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const role = (formData.get("role") as string) ?? "viewer";
    if (email) {
      await sb.from("invitations").insert({
        organization_id: s.membership.organization_id, email, role, invited_by: s.user.id,
      });
      await sb.from("activity_logs").insert({
        organization_id: s.membership.organization_id, actor_id: s.user.id,
        action: "user.invited", detail: `${email} invited as ${role}`,
      });
    }
    redirect("/settings");
  }

  async function changeRole(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const id = formData.get("id") as string;
    const role = formData.get("role") as string;
    if (role !== "owner") {
      await sb.from("memberships").update({ role }).eq("id", id);
      await sb.from("activity_logs").insert({
        organization_id: s.membership.organization_id, actor_id: s.user.id,
        action: "permission.changed", detail: `Member role changed to ${role}`,
      });
    }
    redirect("/settings");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" description="Organization, team, roles, security, and billing."
        actions={<Link href="/settings/billing" className="btn-secondary">Billing & plan</Link>} />

      <div className="space-y-6">
        {/* Organization */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Organization</h2>
          <form action={saveOrg} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Firm name</label>
              <input id="name" name="name" defaultValue={org?.name} disabled={!isAdmin} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="billing_email">Billing email</label>
              <input id="billing_email" name="billing_email" type="email" defaultValue={org?.billing_email ?? ""} disabled={!isAdmin} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Address</label>
              <input id="address" name="address" defaultValue={org?.address ?? ""} disabled={!isAdmin} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="reminders">Default reminders (days before due)</label>
              <input id="reminders" name="reminders" defaultValue={(org?.default_reminder_days ?? [30,14,7,1]).join(", ")} disabled={!isAdmin} className="input" />
            </div>
            <div>
              <label className="label">Logo</label>
              <p className="pt-2 text-sm text-ink-faint">Logo upload coming soon.</p>
            </div>
            {isAdmin && <div className="sm:col-span-2"><button className="btn-primary">Save changes</button></div>}
          </form>
        </section>

        {/* Team */}
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Team</h2>
            <span className="text-xs text-ink-faint">{members?.length ?? 0} members</span>
          </div>
          <div className="mt-4 divide-y divide-line">
            {(members ?? []).map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-medium">{m.users?.full_name || m.users?.email}</div>
                  <div className="text-xs text-ink-faint">{m.users?.email} · joined {fmtDate(m.created_at)}</div>
                </div>
                {m.role === "owner" || !isAdmin ? (
                  <Badge className="bg-canvas capitalize text-ink-soft">{m.role}</Badge>
                ) : (
                  <form action={changeRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <select name="role" defaultValue={m.role} className="input w-auto py-1 text-xs" aria-label="Role">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      <option value="client">client</option>
                    </select>
                    <button className="btn-ghost text-xs">Save</button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <form action={invite} className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <input name="email" type="email" required className="input max-w-xs" placeholder="teammate@firm.com" aria-label="Email to invite" />
              <select name="role" className="input w-auto" aria-label="Role">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="btn-primary">Invite team member</button>
            </form>
          )}
          {invites?.length ? (
            <div className="mt-4 rounded-lg bg-canvas p-3 text-sm">
              <span className="font-medium">Pending: </span>
              {invites.map((i: any) => `${i.email} (${i.role})`).join(", ")}
            </div>
          ) : null}
        </section>

        {/* Roles reference */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Roles & permissions</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {ROLE_DESCRIPTIONS.map(([role, desc]) => (
              <div key={role}>
                <dt className="text-sm font-medium">{role}</dt>
                <dd className="mt-0.5 text-sm text-ink-soft">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Security */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Security</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li><span className="font-medium text-ink">Organization isolation.</span> Row-level security in the database guarantees your data is never visible to another organization.</li>
            <li><span className="font-medium text-ink">Encrypted storage.</span> Documents live in private encrypted storage and download only via 60-second signed URLs.</li>
            <li><span className="font-medium text-ink">Audit log.</span> Every entity change, upload, invitation, and permission change is recorded.</li>
            <li><span className="font-medium text-ink">Sessions.</span> Sign out anywhere from the sidebar; password resets by email from the login screen.</li>
            <li><span className="font-medium text-ink">Multi-factor authentication.</span> <Badge className="bg-canvas text-ink-faint">Coming soon</Badge></li>
          </ul>
        </section>

        {/* API + export */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold">API & data export</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">API key</label>
              <input className="input" disabled value="ent_live_••••••••••••" aria-label="API key placeholder" />
              <p className="mt-1 text-xs text-ink-faint">API access is available on Business and Enterprise plans.</p>
            </div>
            <div>
              <label className="label">Export your data</label>
              <div className="flex gap-2">
                <a href="/api/reports/export?report=entities" className="btn-secondary">Entities CSV</a>
                <a href="/api/reports/export?report=deadlines" className="btn-secondary">Deadlines CSV</a>
              </div>
            </div>
          </div>
        </section>

        <p className="text-xs text-ink-faint">
          <a href="#" className="underline">Privacy policy</a> · <a href="#" className="underline">Terms of service</a> — placeholders pending counsel review.
        </p>
      </div>
    </div>
  );
}
