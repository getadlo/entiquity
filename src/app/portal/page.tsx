import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/shell";
import { Badge, Table } from "@/components/ui";
import { ENTITY_STATUSES, ENTITY_TYPES, STATUS_STYLES, DOC_CATEGORIES, fmtDate, daysUntil } from "@/lib/utils";
import DocumentUpload from "@/components/document-upload";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = createClient();

  // Everything below is filtered by RLS: clients only see rows explicitly shared.
  const { data: access } = await supabase.from("client_portal_access")
    .select("entity_id, can_upload, organization_id, organizations(name)")
    .eq("client_user_id", session.user.id);
  const entityIds = (access ?? []).map((a: any) => a.entity_id);

  const [{ data: entities }, { data: docs }, { data: tasks }] = await Promise.all([
    supabase.from("entities").select("id, legal_name, entity_type, jurisdiction, formation_date, status, registered_agent")
      .in("id", entityIds.length ? entityIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("documents").select("id, name, category, created_at, storage_path, entity_id")
      .eq("shared_with_client", true)
      .in("entity_id", entityIds.length ? entityIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false }),
    supabase.from("compliance_tasks").select("id, name, due_date, status, entity_id")
      .eq("shared_with_client", true)
      .in("entity_id", entityIds.length ? entityIds : ["00000000-0000-0000-0000-000000000000"])
      .order("due_date"),
  ]);

  const firmName = (access?.[0] as any)?.organizations?.name;
  const entityName = (id: string) => (entities ?? []).find((e: any) => e.id === id)?.legal_name ?? "";

  async function signOutAction() {
    "use server";
    const sb = createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-ink-faint">Client portal{firmName ? ` · ${firmName}` : ""}</span>
        </div>
        <form action={signOutAction}><button className="btn-ghost">Sign out</button></form>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your entities</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {firmName ?? "Your firm"} shares these records with you. If something looks off, contact your attorney.
          </p>
        </div>

        {entities?.length ? entities.map((e: any) => (
          <section key={e.id} className="card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold">{e.legal_name}</h2>
              <Badge className={STATUS_STYLES[e.status]}>{ENTITY_STATUSES[e.status]}</Badge>
            </div>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs uppercase tracking-wide text-ink-faint">Type</dt><dd>{ENTITY_TYPES[e.entity_type]}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-ink-faint">Jurisdiction</dt><dd>{e.jurisdiction ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-ink-faint">Formed</dt><dd>{fmtDate(e.formation_date)}</dd></div>
            </dl>

            {(tasks ?? []).filter((t: any) => t.entity_id === e.id).length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold">Filing reminders</h3>
                <ul className="space-y-1.5 text-sm">
                  {(tasks ?? []).filter((t: any) => t.entity_id === e.id).map((t: any) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span>{t.name}</span>
                      <span className={daysUntil(t.due_date) < 7 ? "text-xs font-medium text-danger" : "text-xs text-ink-faint"}>{fmtDate(t.due_date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(docs ?? []).filter((d: any) => d.entity_id === e.id).length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold">Shared documents</h3>
                <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                  {(docs ?? []).filter((d: any) => d.entity_id === e.id).map((d: any) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate">{d.name} <span className="text-xs text-ink-faint">· {DOC_CATEGORIES[d.category]}</span></span>
                      {d.storage_path && <a href={`/api/documents/sign?id=${d.id}`} className="shrink-0 text-sm font-medium text-accent hover:underline">Download</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(access ?? []).find((a: any) => a.entity_id === e.id)?.can_upload && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold">Upload a requested document</h3>
                <DocumentUpload orgId={(access ?? []).find((a: any) => a.entity_id === e.id)!.organization_id} entityId={e.id} />
              </div>
            )}
          </section>
        )) : (
          <div className="card p-10 text-center text-sm text-ink-soft">
            Nothing has been shared with you yet. Your firm controls exactly what appears here.
          </div>
        )}

        <p className="text-xs text-ink-faint">
          entiquity is a software platform for entity management and workflow automation. entiquity does not provide legal advice.
        </p>
      </main>
    </div>
  );
}
