import { redirect } from "next/navigation";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Table, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import ExportButton from "@/components/export-button";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();

  const [{ data: access }, { data: entities }, { data: clientMembers }, { data: invites }] = await Promise.all([
    supabase.from("client_portal_access")
      .select("id, created_at, can_upload, entities(id, legal_name), users:client_user_id(email, full_name)")
      .eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("entities").select("id, legal_name").eq("organization_id", orgId).order("legal_name"),
    supabase.from("memberships").select("user_id, users(email, full_name)").eq("organization_id", orgId).eq("role", "client"),
    supabase.from("invitations").select("id, email, created_at, accepted_at").eq("organization_id", orgId).eq("role", "client").is("accepted_at", null),
  ]);

  async function inviteClient(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (email) {
      await sb.from("invitations").insert({
        organization_id: s.membership.organization_id, email, role: "client", invited_by: s.user.id,
      });
      await sb.from("activity_logs").insert({
        organization_id: s.membership.organization_id, actor_id: s.user.id,
        action: "user.invited", detail: `Client invite sent to ${email}`,
      });
    }
    redirect("/clients");
  }

  async function shareEntity(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const entityId = formData.get("entity_id") as string;
    const clientUserId = formData.get("client_user_id") as string;
    if (entityId && clientUserId) {
      await sb.from("client_portal_access").upsert({
        organization_id: s.membership.organization_id, entity_id: entityId, client_user_id: clientUserId,
      }, { onConflict: "entity_id,client_user_id" });
      await sb.from("activity_logs").insert({
        organization_id: s.membership.organization_id, entity_id: entityId, actor_id: s.user.id,
        action: "permission.changed", detail: "Entity shared with client",
      });
    }
    redirect("/clients");
  }

  async function revoke(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    await sb.from("client_portal_access").delete().eq("id", formData.get("id") as string);
    await sb.from("activity_logs").insert({
      organization_id: s.membership.organization_id, actor_id: s.user.id,
      action: "permission.changed", detail: "Client access revoked",
    });
    redirect("/clients");
  }

  return (
    <div>
      <PageHeader title="Clients"
        description="Invite clients to a secure portal, then share specific entities, documents, and reminders. Internal notes are never shared."
        actions={<ExportButton
          rows={(access ?? []).map((a: any) => ({
            client: a.users?.full_name || a.users?.email || "",
            entity: a.entities?.legal_name ?? "",
            can_upload: a.can_upload ? "Yes" : "No",
            shared: fmtDate(a.created_at),
          }))}
          columns={[
            { key: "client", label: "Client" },
            { key: "entity", label: "Entity" },
            { key: "can_upload", label: "Can upload" },
            { key: "shared", label: "Shared" },
          ]}
          filename="entiquity-client-access" title="Client portal access" />} />

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold">Shared entity access</h2>
            {access?.length ? (
              <Table head={["Client", "Entity", "Can upload", "Shared", ""]}>
                {access.map((a: any) => (
                  <tr key={a.id}>
                    <td className="td font-medium">{a.users?.full_name || a.users?.email}</td>
                    <td className="td text-ink-soft">{a.entities?.legal_name}</td>
                    <td className="td">{a.can_upload ? <Badge className="bg-accent-soft text-accent">Yes</Badge> : <Badge className="bg-canvas text-ink-faint">No</Badge>}</td>
                    <td className="td text-ink-soft">{fmtDate(a.created_at)}</td>
                    <td className="td">
                      <form action={revoke}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-sm font-medium text-danger hover:underline">Revoke</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="Nothing shared yet"
                body="Invite a client, then grant them access to specific entities. They'll only ever see what you share." />
            )}
          </section>

          {invites?.length ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold">Pending client invitations</h2>
              <div className="card divide-y divide-line">
                {invites.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>{i.email}</span>
                    <span className="text-xs text-ink-faint">invited {fmtDate(i.created_at)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <form action={inviteClient} className="card space-y-3 p-5">
            <h3 className="text-sm font-semibold">Invite a client</h3>
            <input name="email" type="email" required className="input" placeholder="client@example.com" aria-label="Client email" />
            <button className="btn-primary w-full">Send invitation</button>
            <p className="text-xs text-ink-faint">They'll create an account and see only the portal — never your workspace.</p>
          </form>

          <form action={shareEntity} className="card space-y-3 p-5">
            <h3 className="text-sm font-semibold">Share an entity</h3>
            <select name="client_user_id" required className="input" aria-label="Client">
              <option value="">Choose client…</option>
              {(clientMembers ?? []).map((m: any) => (
                <option key={m.user_id} value={m.user_id}>{m.users?.full_name || m.users?.email}</option>
              ))}
            </select>
            <select name="entity_id" required className="input" aria-label="Entity">
              <option value="">Choose entity…</option>
              {(entities ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.legal_name}</option>)}
            </select>
            <button className="btn-primary w-full">Grant access</button>
            <p className="text-xs text-ink-faint">Clients see the entity summary, shared documents, and shared reminders only.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
