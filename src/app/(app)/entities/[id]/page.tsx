import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, Table, EmptyState, Disclaimer } from "@/components/ui";
import {
  ENTITY_STATUSES, ENTITY_TYPES, STATUS_STYLES, TASK_STATUSES, TASK_STATUS_STYLES,
  TASK_TYPES, DOC_CATEGORIES, RESOLUTION_TYPES, fmtDate, fmtBytes, daysUntil, cn,
} from "@/lib/utils";
import DocumentUpload from "@/components/document-upload";
import AISummary from "@/components/ai-summary";

export const dynamic = "force-dynamic";

const TABS = [
  ["overview", "Overview"], ["documents", "Documents"], ["compliance", "Compliance"],
  ["ownership", "Ownership"], ["officers", "Officers & Directors"], ["resolutions", "Resolutions"],
  ["activity", "Activity"], ["ai", "AI Summary"],
] as const;

export default async function EntityPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { tab?: string } }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();
  const tab = searchParams.tab ?? "overview";

  const { data: entity } = await supabase
    .from("entities")
    .select("*, parent:parent_entity_id(id, legal_name)")
    .eq("id", params.id).eq("organization_id", orgId).maybeSingle();
  if (!entity) notFound();

  const [
    { data: addresses }, { data: people }, { data: ownership }, { data: docs },
    { data: tasks }, { data: resolutions }, { data: activity }, { data: subs },
  ] = await Promise.all([
    supabase.from("entity_addresses").select("*").eq("entity_id", entity.id),
    supabase.from("entity_people").select("*").eq("entity_id", entity.id).order("start_date"),
    supabase.from("entity_ownership").select("*").eq("entity_id", entity.id).order("percentage", { ascending: false }),
    supabase.from("documents").select("*").eq("entity_id", entity.id).order("created_at", { ascending: false }),
    supabase.from("compliance_tasks").select("*").eq("entity_id", entity.id).order("due_date"),
    supabase.from("resolutions").select("id, title, resolution_type, status, created_at").eq("entity_id", entity.id).order("created_at", { ascending: false }),
    supabase.from("activity_logs").select("*").eq("entity_id", entity.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("entities").select("id, legal_name, status").eq("parent_entity_id", entity.id),
  ]);

  // ---- server actions -------------------------------------------------------
  async function addPerson(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const g = (k: string) => (formData.get(k) as string)?.trim() || null;
    await sb.from("entity_people").insert({
      entity_id: params.id, name: g("name"), role: g("role") ?? "officer", title: g("title"),
      email: g("email"), phone: g("phone"), start_date: g("start_date"), end_date: g("end_date"), notes: g("notes"),
    });
    await sb.from("activity_logs").insert({
      organization_id: s.membership.organization_id, entity_id: params.id, actor_id: s.user.id,
      action: "entity.updated", detail: `${g("name")} added as ${g("title") || g("role")}`,
    });
    redirect(`/entities/${params.id}?tab=officers`);
  }

  async function addOwner(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const g = (k: string) => (formData.get(k) as string)?.trim() || null;
    await sb.from("entity_ownership").insert({
      entity_id: params.id, owner_name: g("owner_name"), owner_type: g("owner_type") ?? "individual",
      percentage: g("percentage") ? Number(g("percentage")) : null,
      units: g("units") ? Number(g("units")) : null,
      effective_date: g("effective_date"), notes: g("notes"),
    });
    await sb.from("activity_logs").insert({
      organization_id: s.membership.organization_id, entity_id: params.id, actor_id: s.user.id,
      action: "entity.updated", detail: `Ownership record added: ${g("owner_name")}`,
    });
    redirect(`/entities/${params.id}?tab=ownership`);
  }

  async function addTask(formData: FormData) {
    "use server";
    const s = await getSession(); if (!s?.membership) redirect("/login");
    const sb = createClient();
    const g = (k: string) => (formData.get(k) as string)?.trim() || null;
    await sb.from("compliance_tasks").insert({
      organization_id: s.membership.organization_id, entity_id: params.id,
      name: g("name"), task_type: g("task_type") ?? "custom", due_date: g("due_date"),
      priority: g("priority") ?? "normal", notes: g("notes"), assigned_to: s.user.id,
    });
    await sb.from("activity_logs").insert({
      organization_id: s.membership.organization_id, entity_id: params.id, actor_id: s.user.id,
      action: "task.created", detail: `${g("name")} due ${g("due_date")}`,
    });
    redirect(`/entities/${params.id}?tab=compliance`);
  }

  // ---- helpers ---------------------------------------------------------------
  const principal = (addresses ?? []).find((a: any) => a.kind === "principal_office");
  const mailing = (addresses ?? []).find((a: any) => a.kind === "mailing");
  const fmtAddr = (a: any) => a ? [a.line1, a.line2, [a.city, a.region].filter(Boolean).join(", "), a.postal_code].filter(Boolean).join(", ") : "—";
  const officers = (people ?? []).filter((p: any) => ["officer", "manager"].includes(p.role));
  const directors = (people ?? []).filter((p: any) => p.role === "director");
  const members = (people ?? []).filter((p: any) => ["member", "shareholder", "other"].includes(p.role));

  return (
    <div>
      {/* Header */}
      <div className="mb-1 text-sm"><Link href="/entities" className="text-ink-faint hover:text-ink">Entities</Link> <span className="text-ink-faint">/</span></div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{entity.legal_name}</h1>
        <Badge className={STATUS_STYLES[entity.status]}>{ENTITY_STATUSES[entity.status]}</Badge>
        <span className="text-sm text-ink-faint">{ENTITY_TYPES[entity.entity_type]} · {entity.jurisdiction ?? "No jurisdiction"}</span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/entities/${entity.id}?tab=${key}`}
            className={cn("tab", tab === key && "tab-active")}>{label}</Link>
        ))}
      </div>

      {/* ------------------------------ OVERVIEW ------------------------------ */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold">Entity details</h2>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ["Legal name", entity.legal_name],
                ["Entity type", ENTITY_TYPES[entity.entity_type]],
                ["Jurisdiction", entity.jurisdiction ?? "—"],
                ["Formation date", fmtDate(entity.formation_date)],
                ["EIN / tax ID", entity.ein ?? "—"],
                ["Registered agent", entity.registered_agent ?? "—"],
                ["Client / matter", entity.client_matter ?? "—"],
                ["Parent entity", entity.parent ? undefined : "—"],
                ["Principal office", fmtAddr(principal)],
                ["Mailing address", fmtAddr(mailing)],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
                  <dd className="mt-0.5 text-sm">
                    {label === "Parent entity" && entity.parent
                      ? <Link className="font-medium text-accent hover:underline" href={`/entities/${(entity.parent as any).id}`}>{(entity.parent as any).legal_name}</Link>
                      : (value as string)}
                  </dd>
                </div>
              ))}
            </dl>
            {entity.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {entity.tags.map((t: string) => <Badge key={t} className="bg-canvas text-ink-soft">{t}</Badge>)}
              </div>
            )}
            {entity.internal_notes && (
              <div className="mt-5 rounded-lg bg-canvas p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">Internal notes · never shared with clients</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{entity.internal_notes}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold">Subsidiaries</h3>
              {subs?.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {subs.map((s: any) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <Link href={`/entities/${s.id}`} className="truncate font-medium hover:text-accent">{s.legal_name}</Link>
                      <Badge className={STATUS_STYLES[s.status]}>{ENTITY_STATUSES[s.status]}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-ink-soft">None on record.</p>}
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold">Important dates</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {(tasks ?? []).filter((t: any) => !["completed","filed"].includes(t.status)).slice(0, 4).map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.name}</span>
                    <span className={daysUntil(t.due_date) < 0 ? "text-danger text-xs font-medium" : "text-xs text-ink-faint"}>{fmtDate(t.due_date)}</span>
                  </li>
                ))}
                {!tasks?.length && <li className="text-ink-soft">No deadlines tracked yet.</li>}
              </ul>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold">On file</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                <li>{docs?.length ?? 0} documents</li>
                <li>{people?.length ?? 0} people</li>
                <li>{ownership?.length ?? 0} ownership records</li>
                <li>{resolutions?.length ?? 0} resolutions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ DOCUMENTS ------------------------------ */}
      {tab === "documents" && (
        <div className="space-y-4">
          <DocumentUpload orgId={orgId} entityId={entity.id} />
          {docs?.length ? (
            <Table head={["Document", "Category", "Size", "Uploaded", "Client access", ""]}>
              {docs.map((d: any) => (
                <tr key={d.id} className="hover:bg-canvas/60">
                  <td className="td font-medium">{d.name}</td>
                  <td className="td text-ink-soft">{DOC_CATEGORIES[d.category]}</td>
                  <td className="td text-ink-soft">{fmtBytes(d.size_bytes)}</td>
                  <td className="td text-ink-soft">{fmtDate(d.created_at)}</td>
                  <td className="td">{d.shared_with_client ? <Badge className="bg-accent-soft text-accent">Shared</Badge> : <Badge className="bg-canvas text-ink-faint">Internal</Badge>}</td>
                  <td className="td">
                    {d.storage_path
                      ? <a className="text-sm font-medium text-accent hover:underline" href={`/api/documents/sign?id=${d.id}`}>Download</a>
                      : <span className="text-xs text-ink-faint">metadata only</span>}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No documents yet" body="Upload formation documents, agreements, and filings. Text is extracted automatically for AI search." />
          )}
        </div>
      )}

      {/* ------------------------------ COMPLIANCE ------------------------------ */}
      {tab === "compliance" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
          <div>
            {tasks?.length ? (
              <Table head={["Task", "Type", "Due", "Priority", "Status"]}>
                {tasks.map((t: any) => (
                  <tr key={t.id} className="hover:bg-canvas/60">
                    <td className="td font-medium">{t.name}{t.notes && <div className="text-xs font-normal text-ink-faint">{t.notes}</div>}</td>
                    <td className="td text-ink-soft">{TASK_TYPES[t.task_type]}</td>
                    <td className="td">{fmtDate(t.due_date)}<div className={`text-xs ${daysUntil(t.due_date) < 0 ? "text-danger" : "text-ink-faint"}`}>{daysUntil(t.due_date) < 0 ? `${Math.abs(daysUntil(t.due_date))}d late` : `in ${daysUntil(t.due_date)}d`}</div></td>
                    <td className="td capitalize text-ink-soft">{t.priority}</td>
                    <td className="td"><Badge className={TASK_STATUS_STYLES[t.status]}>{TASK_STATUSES[t.status]}</Badge></td>
                  </tr>
                ))}
              </Table>
            ) : <EmptyState title="No compliance items" body="Track annual reports, franchise taxes, RA renewals, and custom reminders for this entity." />}
          </div>
          <form action={addTask} className="card h-fit space-y-3 p-5">
            <h3 className="text-sm font-semibold">Add filing deadline</h3>
            <input name="name" required className="input" placeholder="Task name" aria-label="Task name" />
            <select name="task_type" className="input" aria-label="Task type">
              {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input name="due_date" type="date" required className="input" aria-label="Due date" />
            <select name="priority" className="input" aria-label="Priority">
              <option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option>
            </select>
            <textarea name="notes" rows={2} className="input" placeholder="Notes" aria-label="Notes" />
            <button className="btn-primary w-full">Add deadline</button>
          </form>
        </div>
      )}

      {/* ------------------------------ OWNERSHIP ------------------------------ */}
      {tab === "ownership" && (
        <div className="space-y-6">
          {/* Visual ownership chart */}
          {ownership?.length ? (
            <div className="card p-6">
              <h3 className="mb-4 text-sm font-semibold">Ownership chart</h3>
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-3">
                  {ownership.map((o: any) => (
                    <div key={o.id} className="rounded-lg border border-line bg-canvas px-4 py-2.5 text-center">
                      <div className="text-sm font-medium">{o.owner_name}</div>
                      <div className="text-xs text-ink-faint capitalize">{o.owner_type}</div>
                    </div>
                  ))}
                </div>
                <div className="my-2 flex gap-16">
                  {ownership.map((o: any) => (
                    <div key={o.id} className="flex flex-col items-center">
                      <div className="h-6 w-px bg-line" />
                      <span className="text-xs font-medium text-accent">{o.percentage != null ? `${Number(o.percentage)}%` : "—"}</span>
                      <div className="h-6 w-px bg-line" />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border-2 border-accent bg-accent-soft px-5 py-3 text-center">
                  <div className="text-sm font-semibold">{entity.legal_name}</div>
                  <div className="text-xs text-ink-soft">{ENTITY_TYPES[entity.entity_type]} · {entity.jurisdiction}</div>
                </div>
                {subs?.length ? (
                  <>
                    <div className="my-2 h-6 w-px bg-line" />
                    <div className="flex flex-wrap justify-center gap-3">
                      {subs.map((s: any) => (
                        <Link key={s.id} href={`/entities/${s.id}`} className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:border-accent">
                          {s.legal_name}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="mt-6 space-y-2">
                {ownership.map((o: any) => (
                  <div key={o.id} className="flex items-center gap-3 text-sm">
                    <span className="w-52 shrink-0 truncate">{o.owner_name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(Number(o.percentage) || 0, 100)}%` }} />
                    </div>
                    <span className="w-14 text-right tabular-nums text-ink-soft">{o.percentage != null ? `${Number(o.percentage)}%` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
            <div>
              {ownership?.length ? (
                <Table head={["Owner", "Type", "Percentage", "Units / shares", "Effective", "Notes"]}>
                  {ownership.map((o: any) => (
                    <tr key={o.id}>
                      <td className="td font-medium">{o.owner_name}</td>
                      <td className="td capitalize text-ink-soft">{o.owner_type}</td>
                      <td className="td tabular-nums">{o.percentage != null ? `${Number(o.percentage)}%` : "—"}</td>
                      <td className="td tabular-nums text-ink-soft">{o.units ?? "—"}</td>
                      <td className="td text-ink-soft">{fmtDate(o.effective_date)}</td>
                      <td className="td text-ink-soft">{o.notes ?? "—"}</td>
                    </tr>
                  ))}
                </Table>
              ) : <EmptyState title="No ownership records" body="Add members, shareholders, or partners with percentages and effective dates." />}
            </div>
            <form action={addOwner} className="card h-fit space-y-3 p-5">
              <h3 className="text-sm font-semibold">Add ownership record</h3>
              <input name="owner_name" required className="input" placeholder="Owner name" aria-label="Owner name" />
              <select name="owner_type" className="input" aria-label="Owner type">
                <option value="individual">Individual</option><option value="entity">Entity</option>
                <option value="trust">Trust</option><option value="other">Other</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input name="percentage" type="number" step="0.0001" min="0" max="100" className="input" placeholder="%" aria-label="Percentage" />
                <input name="units" type="number" step="any" className="input" placeholder="Units / shares" aria-label="Units" />
              </div>
              <input name="effective_date" type="date" className="input" aria-label="Effective date" />
              <textarea name="notes" rows={2} className="input" placeholder="Notes" aria-label="Notes" />
              <button className="btn-primary w-full">Add record</button>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------- OFFICERS & DIRECTORS --------------------------- */}
      {tab === "officers" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
          <div className="space-y-6">
            {[["Officers & managers", officers], ["Directors", directors], ["Members & shareholders", members]].map(([label, rows]: any) =>
              rows.length ? (
                <section key={label}>
                  <h3 className="mb-2 text-sm font-semibold">{label}</h3>
                  <Table head={["Name", "Title / role", "Email", "Phone", "Tenure"]}>
                    {rows.map((p: any) => (
                      <tr key={p.id}>
                        <td className="td font-medium">{p.name}</td>
                        <td className="td text-ink-soft">{p.title ?? p.role}</td>
                        <td className="td text-ink-soft">{p.email ?? "—"}</td>
                        <td className="td text-ink-soft">{p.phone ?? "—"}</td>
                        <td className="td text-ink-soft">{fmtDate(p.start_date)}{p.end_date ? ` – ${fmtDate(p.end_date)}` : " – present"}</td>
                      </tr>
                    ))}
                  </Table>
                </section>
              ) : null
            )}
            {!people?.length && <EmptyState title="No people on record" body="Track officers, directors, members, and shareholders with tenure dates." />}
          </div>
          <form action={addPerson} className="card h-fit space-y-3 p-5">
            <h3 className="text-sm font-semibold">Add person</h3>
            <input name="name" required className="input" placeholder="Full name" aria-label="Name" />
            <select name="role" className="input" aria-label="Role">
              <option value="officer">Officer</option><option value="director">Director</option>
              <option value="manager">Manager</option><option value="member">Member</option>
              <option value="shareholder">Shareholder</option><option value="other">Other</option>
            </select>
            <input name="title" className="input" placeholder="Title (e.g. Treasurer)" aria-label="Title" />
            <input name="email" type="email" className="input" placeholder="Email" aria-label="Email" />
            <input name="phone" className="input" placeholder="Phone" aria-label="Phone" />
            <div className="grid grid-cols-2 gap-2">
              <input name="start_date" type="date" className="input" aria-label="Start date" />
              <input name="end_date" type="date" className="input" aria-label="End date" />
            </div>
            <textarea name="notes" rows={2} className="input" placeholder="Notes" aria-label="Notes" />
            <button className="btn-primary w-full">Add person</button>
          </form>
        </div>
      )}

      {/* ------------------------------ RESOLUTIONS ------------------------------ */}
      {tab === "resolutions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/resolutions/new?entity=${entity.id}`} className="btn-primary">Draft with AI</Link>
          </div>
          {resolutions?.length ? (
            <Table head={["Title", "Type", "Status", "Created"]}>
              {resolutions.map((r: any) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <td className="td"><Link href={`/resolutions?open=${r.id}`} className="font-medium hover:text-accent">{r.title}</Link></td>
                  <td className="td text-ink-soft">{RESOLUTION_TYPES[r.resolution_type]}</td>
                  <td className="td"><Badge className={r.status === "final" ? "bg-accent-soft text-accent" : "bg-amber-50 text-warn"}>{r.status}</Badge></td>
                  <td className="td text-ink-soft">{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No resolutions yet" body="Generate board resolutions, consents, and minutes from templates — pre-filled with this entity's officers."
              action={<Link href={`/resolutions/new?entity=${entity.id}`} className="btn-primary">Draft a resolution</Link>} />
          )}
          <Disclaimer />
        </div>
      )}

      {/* ------------------------------ ACTIVITY ------------------------------ */}
      {tab === "activity" && (
        <div className="card divide-y divide-line">
          {(activity ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className="mr-2 rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink-faint">{a.action}</span>
                <span className="text-ink-soft">{a.detail}</span>
              </div>
              <span className="shrink-0 text-xs text-ink-faint">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
          {!activity?.length && <p className="px-4 py-8 text-center text-sm text-ink-soft">No activity recorded yet.</p>}
        </div>
      )}

      {/* ------------------------------ AI SUMMARY ------------------------------ */}
      {tab === "ai" && <AISummary entityId={entity.id} entityName={entity.legal_name} />}
    </div>
  );
}
