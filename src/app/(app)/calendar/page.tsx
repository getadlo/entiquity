import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Table, EmptyState } from "@/components/ui";
import { TASK_STATUSES, TASK_STATUS_STYLES, TASK_TYPES, fmtDate, daysUntil, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIEWS = [
  ["list", "All tasks"], ["calendar", "Calendar"], ["next30", "Next 30 days"],
  ["overdue", "Overdue"], ["mine", "Assigned to me"],
] as const;

export default async function CalendarPage({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const userId = session!.user.id;
  const supabase = createClient();
  const view = searchParams.view ?? "list";
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase.from("compliance_tasks")
    .select("*, entities(id, legal_name), users:assigned_to(full_name, email)")
    .eq("organization_id", orgId).order("due_date").limit(500);
  if (view === "overdue") query = query.lt("due_date", today).not("status", "in", "(completed,filed)");
  if (view === "next30") query = query.gte("due_date", today).lte("due_date", new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  if (view === "mine") query = query.eq("assigned_to", userId);
  const { data: tasks } = await query;

  const { data: entities } = await supabase.from("entities")
    .select("id, legal_name").eq("organization_id", orgId).order("legal_name");

  async function createTask(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const g = (k: string) => (formData.get(k) as string)?.trim() || null;
    await sb.from("compliance_tasks").insert({
      organization_id: s.membership.organization_id,
      entity_id: g("entity_id"), name: g("name"), task_type: g("task_type") ?? "custom",
      due_date: g("due_date"), priority: g("priority") ?? "normal",
      status: g("status") ?? "not_started", notes: g("notes"), assigned_to: s.user.id,
    });
    await sb.from("activity_logs").insert({
      organization_id: s.membership.organization_id, entity_id: g("entity_id"),
      actor_id: s.user.id, action: "task.created", detail: `${g("name")} due ${g("due_date")}`,
    });
    redirect("/calendar");
  }

  async function setStatus(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    await sb.from("compliance_tasks").update({
      status, completed_at: ["completed", "filed"].includes(status) ? new Date().toISOString() : null,
    }).eq("id", id);
    redirect(`/calendar?view=${formData.get("view") ?? "list"}`);
  }

  // Simple month grid for calendar view
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = new Date(monthStart); gridStart.setDate(1 - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d; });
  const byDate: Record<string, any[]> = {};
  (tasks ?? []).forEach((t: any) => { (byDate[t.due_date] ??= []).push(t); });

  return (
    <div>
      <PageHeader title="Compliance calendar" description="Annual reports, franchise taxes, renewals, and reminders across every entity." />

      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-white p-1">
        {VIEWS.map(([key, label]) => (
          <Link key={key} href={`/calendar?view=${key}`}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", view === key ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-ink")}>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div>
          {view === "calendar" ? (
            <div className="card overflow-hidden">
              <div className="border-b border-line bg-canvas/60 px-4 py-3 text-sm font-semibold">
                {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="grid grid-cols-7 border-b border-line text-center text-xs font-medium text-ink-faint">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const iso = d.toISOString().slice(0, 10);
                  const inMonth = d.getMonth() === now.getMonth();
                  const isToday = iso === today;
                  return (
                    <div key={i} className={cn("min-h-[84px] border-b border-r border-line p-1.5", !inMonth && "bg-canvas/50")}>
                      <div className={cn("mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-accent font-semibold text-white" : "text-ink-faint")}>{d.getDate()}</div>
                      {(byDate[iso] ?? []).slice(0, 2).map((t: any) => (
                        <div key={t.id} className={cn("mb-0.5 truncate rounded px-1 py-0.5 text-[11px] font-medium",
                          daysUntil(t.due_date) < 0 && !["completed","filed"].includes(t.status) ? "bg-red-50 text-danger" : "bg-accent-soft text-accent")}>
                          {t.name}
                        </div>
                      ))}
                      {(byDate[iso]?.length ?? 0) > 2 && <div className="text-[10px] text-ink-faint">+{byDate[iso].length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : tasks?.length ? (
            <Table head={["Task", "Entity", "Type", "Due", "Status", "Update"]}>
              {tasks.map((t: any) => (
                <tr key={t.id} className="hover:bg-canvas/60">
                  <td className="td font-medium">{t.name}{t.priority === "high" && <Badge className="ml-2 bg-red-50 text-danger">High</Badge>}</td>
                  <td className="td">{t.entities ? <Link href={`/entities/${t.entities.id}?tab=compliance`} className="text-accent hover:underline">{t.entities.legal_name}</Link> : "—"}</td>
                  <td className="td text-ink-soft">{TASK_TYPES[t.task_type]}</td>
                  <td className="td">{fmtDate(t.due_date)}
                    <div className={cn("text-xs", daysUntil(t.due_date) < 0 && !["completed","filed"].includes(t.status) ? "text-danger" : "text-ink-faint")}>
                      {daysUntil(t.due_date) < 0 ? `${Math.abs(daysUntil(t.due_date))}d late` : `in ${daysUntil(t.due_date)}d`}
                    </div>
                  </td>
                  <td className="td"><Badge className={TASK_STATUS_STYLES[t.status]}>{TASK_STATUSES[t.status]}</Badge></td>
                  <td className="td">
                    <form action={setStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="view" value={view} />
                      <select name="status" defaultValue={t.status} className="input w-auto py-1 text-xs" aria-label="Set status">
                        {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button className="btn-ghost text-xs">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="Nothing here" body={view === "overdue" ? "No overdue tasks — well done." : "Add your first filing deadline to start the calendar."} />
          )}
        </div>

        <form action={createTask} className="card h-fit space-y-3 p-5">
          <h3 className="text-sm font-semibold">Add filing deadline</h3>
          <input name="name" required className="input" placeholder="Task name" aria-label="Task name" />
          <select name="entity_id" className="input" aria-label="Entity">
            <option value="">No entity</option>
            {(entities ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.legal_name}</option>)}
          </select>
          <select name="task_type" className="input" aria-label="Task type">
            {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input name="due_date" type="date" required className="input" aria-label="Due date" />
          <div className="grid grid-cols-2 gap-2">
            <select name="priority" className="input" aria-label="Priority">
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
            </select>
            <select name="status" className="input" aria-label="Status">
              {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea name="notes" rows={2} className="input" placeholder="Notes" aria-label="Notes" />
          <button className="btn-primary w-full">Add deadline</button>
          <p className="text-xs text-ink-faint">Reminders default to 30 / 7 / 1 days before the due date (configurable in Settings).</p>
        </form>
      </div>
    </div>
  );
}
