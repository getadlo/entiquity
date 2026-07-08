import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader } from "@/components/ui";
import { ENTITY_STATUSES, TASK_TYPES, fmtDate, daysUntil } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: entities }, { data: tasks }, { data: docs }, { data: ownership }] = await Promise.all([
    supabase.from("entities").select("id, legal_name, jurisdiction, status, client_matter").eq("organization_id", orgId),
    supabase.from("compliance_tasks").select("id, name, entity_id, task_type, due_date, status").eq("organization_id", orgId),
    supabase.from("documents").select("entity_id, category").eq("organization_id", orgId),
    supabase.from("entity_ownership").select("entity_id, owner_name, percentage"),
  ]);

  const byJurisdiction: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byClient: Record<string, number> = {};
  (entities ?? []).forEach((e: any) => {
    byJurisdiction[e.jurisdiction ?? "Unknown"] = (byJurisdiction[e.jurisdiction ?? "Unknown"] ?? 0) + 1;
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    const client = e.client_matter?.split("/")[0]?.trim() || "Unassigned";
    byClient[client] = (byClient[client] ?? 0) + 1;
  });

  const open = (tasks ?? []).filter((t: any) => !["completed","filed"].includes(t.status));
  const upcoming = open.filter((t: any) => t.due_date >= today).sort((a: any, b: any) => a.due_date.localeCompare(b.due_date)).slice(0, 10);
  const overdue = open.filter((t: any) => t.due_date < today);

  const hasOA = new Set((docs ?? []).filter((d: any) => ["operating_agreement","bylaws"].includes(d.category)).map((d: any) => d.entity_id));
  const missingDocs = (entities ?? []).filter((e: any) => !hasOA.has(e.id));
  const entityName = (id: string) => (entities ?? []).find((e: any) => e.id === id)?.legal_name ?? "—";

  const Bar = ({ data }: { data: Record<string, number> }) => {
    const max = Math.max(...Object.values(data), 1);
    return (
      <div className="space-y-2.5">
        {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 truncate text-ink-soft">{k}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums text-ink-soft">{v}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Reports" description="Portfolio-level views across your entity book."
        actions={<>
          <a href="/api/reports/export?report=entities" className="btn-secondary">Export entities CSV</a>
          <a href="/api/reports/export?report=deadlines" className="btn-secondary">Export deadlines CSV</a>
          <button className="btn-secondary" disabled title="PDF export is coming soon">Export PDF</button>
        </>} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6"><h2 className="mb-4 text-sm font-semibold">Entities by jurisdiction</h2><Bar data={byJurisdiction} /></section>
        <section className="card p-6"><h2 className="mb-4 text-sm font-semibold">Entities by status</h2>
          <Bar data={Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [ENTITY_STATUSES[k] ?? k, v]))} /></section>
        <section className="card p-6"><h2 className="mb-4 text-sm font-semibold">Client entity summary</h2><Bar data={byClient} /></section>

        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold">Overdue filings ({overdue.length})</h2>
          {overdue.length ? (
            <ul className="space-y-2 text-sm">
              {overdue.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.name} <span className="text-ink-faint">· {entityName(t.entity_id)}</span></span>
                  <Badge className="bg-red-50 text-danger">{Math.abs(daysUntil(t.due_date))}d late</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">No overdue filings.</p>}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold">Upcoming deadlines</h2>
          <ul className="space-y-2 text-sm">
            {upcoming.map((t: any) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.name} <span className="text-ink-faint">· {TASK_TYPES[t.task_type]}</span></span>
                <span className="shrink-0 text-xs text-ink-faint">{fmtDate(t.due_date)}</span>
              </li>
            ))}
            {!upcoming.length && <li className="text-ink-soft">No upcoming deadlines tracked.</li>}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold">Missing operating agreements / bylaws ({missingDocs.length})</h2>
          {missingDocs.length ? (
            <ul className="space-y-2 text-sm">
              {missingDocs.map((e: any) => (
                <li key={e.id}>
                  <Link href={`/entities/${e.id}?tab=documents`} className="font-medium hover:text-accent">{e.legal_name}</Link>
                  <span className="text-ink-faint"> — no governing document on file</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">Every entity has a governing document on file.</p>}
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 text-sm font-semibold">Ownership summary</h2>
        <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {(entities ?? []).map((e: any) => {
            const owners = (ownership ?? []).filter((o: any) => o.entity_id === e.id);
            if (!owners.length) return null;
            return (
              <div key={e.id} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5">
                <Link href={`/entities/${e.id}?tab=ownership`} className="truncate font-medium hover:text-accent">{e.legal_name}</Link>
                <span className="shrink-0 text-xs text-ink-soft">
                  {owners.slice(0, 2).map((o: any) => `${o.owner_name} ${o.percentage ?? "?"}%`).join(" · ")}{owners.length > 2 ? ` +${owners.length - 2}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
