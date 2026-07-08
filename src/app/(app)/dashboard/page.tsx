import Link from "next/link";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, StatCard, Table, EmptyState } from "@/components/ui";
import { ENTITY_STATUSES, STATUS_STYLES, TASK_STATUS_STYLES, TASK_STATUSES, fmtDate, daysUntil } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [
    { count: entityCount },
    { data: upcoming },
    { data: overdue },
    { data: recentDocs },
    { data: recentEntities },
    { data: statusRows },
    { data: activity },
  ] = await Promise.all([
    supabase.from("entities").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("compliance_tasks").select("id, name, due_date, status, entities(id, legal_name)")
      .eq("organization_id", orgId).gte("due_date", today).lte("due_date", in30)
      .not("status", "in", "(completed,filed)").order("due_date").limit(6),
    supabase.from("compliance_tasks").select("id, name, due_date, entities(legal_name)")
      .eq("organization_id", orgId).lt("due_date", today)
      .not("status", "in", "(completed,filed)").order("due_date").limit(6),
    supabase.from("documents").select("id, name, created_at, entities(legal_name)")
      .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("entities").select("id, legal_name, status, updated_at")
      .eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(5),
    supabase.from("entities").select("status").eq("organization_id", orgId),
    supabase.from("activity_logs").select("action, detail, created_at")
      .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(6),
  ]);

  const statusCounts: Record<string, number> = {};
  (statusRows ?? []).forEach((r: any) => { statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1; });
  const missingAgreements = null; // surfaced by AI alerts below

  const quickActions = [
    { href: "/entities/new", label: "Add entity" },
    { href: "/documents?upload=1", label: "Upload document" },
    { href: "/resolutions/new", label: "Create resolution" },
    { href: "/calendar?new=1", label: "Add filing deadline" },
    { href: "/settings?invite=1", label: "Invite user" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your firm's entity book at a glance."
        actions={quickActions.map((a, i) => (
          <Link key={a.href} href={a.href} className={i === 0 ? "btn-primary" : "btn-secondary"}>{a.label}</Link>
        ))}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total entities" value={entityCount ?? 0} href="/entities" />
        <StatCard label="Deadlines · next 30 days" value={upcoming?.length ?? 0} href="/calendar" tone={upcoming?.length ? "warn" : undefined} />
        <StatCard label="Overdue tasks" value={overdue?.length ?? 0} href="/calendar?view=overdue" tone={overdue?.length ? "danger" : undefined} />
        <StatCard label="Recent uploads" value={recentDocs?.length ?? 0} href="/documents" hint="last 5 shown below" />
      </div>

      {/* AI alerts */}
      <div className="card mt-6 flex items-start gap-3 border-accent-ring bg-accent-soft/40 p-4">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white text-xs font-semibold">AI</span>
        <div className="text-sm">
          <p className="font-medium">entiquity Assistant</p>
          <p className="mt-0.5 text-ink-soft">
            {(overdue?.length ?? 0) > 0
              ? `${overdue!.length} task${overdue!.length === 1 ? " is" : "s are"} overdue — start with ${((overdue![0] as any).entities?.legal_name) ?? "the oldest one"}. `
              : "No overdue tasks — nice. "}
            Ask me things like "Which entities are missing operating agreements?" or "Summarize Acme Holdings."
          </p>
          <Link href="/assistant" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">Open assistant →</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Upcoming deadlines */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming filing deadlines</h2>
            <Link href="/calendar" className="text-sm font-medium text-accent hover:underline">View calendar</Link>
          </div>
          {upcoming?.length ? (
            <div className="card divide-y divide-line">
              {upcoming.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="text-xs text-ink-faint">{t.entities?.legal_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">{fmtDate(t.due_date)}</div>
                    <div className={`text-xs ${daysUntil(t.due_date) <= 7 ? "text-danger" : "text-ink-faint"}`}>
                      in {daysUntil(t.due_date)} days
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No deadlines in the next 30 days" body="Add filing deadlines so nothing slips."
              action={<Link href="/calendar?new=1" className="btn-secondary">Add filing deadline</Link>} />
          )}
        </section>

        {/* Overdue */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Overdue</h2>
            <Link href="/calendar?view=overdue" className="text-sm font-medium text-accent hover:underline">View all</Link>
          </div>
          {overdue?.length ? (
            <div className="card divide-y divide-line">
              {overdue.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="text-xs text-ink-faint">{t.entities?.legal_name}</div>
                  </div>
                  <Badge className="bg-red-50 text-danger">{Math.abs(daysUntil(t.due_date))} days late</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="card px-4 py-6 text-sm text-ink-soft">Nothing overdue. Keep it that way.</div>
          )}
        </section>

        {/* Status breakdown */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Entity status breakdown</h2>
          <div className="card p-4">
            {Object.keys(statusCounts).length === 0 && <p className="text-sm text-ink-soft">No entities yet.</p>}
            <div className="space-y-2.5">
              {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, n]) => (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-ink-soft">{ENTITY_STATUSES[status] ?? status}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(n / (entityCount || 1)) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-ink-soft">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
          <div className="card divide-y divide-line">
            {(activity ?? []).map((a: any, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="truncate">{a.detail ?? a.action}</span>
                <span className="shrink-0 text-xs text-ink-faint">{fmtDate(a.created_at)}</span>
              </div>
            ))}
            {!activity?.length && <p className="px-4 py-6 text-sm text-ink-soft">Activity will appear here as your team works.</p>}
          </div>
        </section>
      </div>

      {/* Recently updated entities */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recently updated entities</h2>
        <Table head={["Entity", "Status", "Updated"]}>
          {(recentEntities ?? []).map((e: any) => (
            <tr key={e.id} className="hover:bg-canvas/60">
              <td className="td"><Link href={`/entities/${e.id}`} className="font-medium hover:text-accent">{e.legal_name}</Link></td>
              <td className="td"><Badge className={STATUS_STYLES[e.status]}>{ENTITY_STATUSES[e.status]}</Badge></td>
              <td className="td text-ink-soft">{fmtDate(e.updated_at)}</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
