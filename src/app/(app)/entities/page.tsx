import Link from "next/link";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Table, EmptyState } from "@/components/ui";
import { ENTITY_STATUSES, ENTITY_TYPES, STATUS_STYLES, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EntitiesPage({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();

  const q = searchParams.q?.trim();
  const type = searchParams.type;
  const status = searchParams.status;
  const jurisdiction = searchParams.jurisdiction;

  let query = supabase
    .from("entities")
    .select("id, legal_name, entity_type, jurisdiction, formation_date, status, client_matter, tags")
    .eq("organization_id", orgId)
    .order("legal_name")
    .limit(500);
  if (q) query = query.or(`legal_name.ilike.%${q}%,client_matter.ilike.%${q}%,ein.ilike.%${q}%`);
  if (type) query = query.eq("entity_type", type);
  if (status) query = query.eq("status", status);
  if (jurisdiction) query = query.ilike("jurisdiction", `%${jurisdiction}%`);
  const { data: entities } = await query;

  const { data: jurisdictions } = await supabase
    .from("entities").select("jurisdiction").eq("organization_id", orgId).not("jurisdiction", "is", null);
  const uniqueJurisdictions = Array.from(new Set((jurisdictions ?? []).map((j: any) => j.jurisdiction))).sort();

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { q, type, status, jurisdiction, ...params };
    const s = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]);
    return `/entities?${s.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Entities" description={`${entities?.length ?? 0} entit${(entities?.length ?? 0) === 1 ? "y" : "ies"}${q ? ` matching "${q}"` : ""}`}
        actions={<Link href="/entities/new" className="btn-primary">Add entity</Link>} />

      {/* Filters */}
      <form className="mb-4 grid gap-2 sm:grid-cols-4" action="/entities" method="get">
        <input name="q" defaultValue={q} className="input" placeholder="Search name, matter, EIN…" aria-label="Search entities" />
        <select name="type" defaultValue={type ?? ""} className="input" aria-label="Entity type">
          <option value="">All types</option>
          {Object.entries(ENTITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(ENTITY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="jurisdiction" defaultValue={jurisdiction ?? ""} className="input" aria-label="Jurisdiction">
            <option value="">All jurisdictions</option>
            {uniqueJurisdictions.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <button className="btn-secondary shrink-0">Filter</button>
        </div>
      </form>

      {entities?.length ? (
        <Table head={["Legal name", "Type", "Jurisdiction", "Formed", "Client / matter", "Status"]}>
          {entities.map((e: any) => (
            <tr key={e.id} className="hover:bg-canvas/60">
              <td className="td">
                <Link href={`/entities/${e.id}`} className="font-medium hover:text-accent">{e.legal_name}</Link>
                {e.tags?.length > 0 && (
                  <span className="ml-2 hidden gap-1 lg:inline-flex">
                    {e.tags.slice(0, 2).map((t: string) => <Badge key={t} className="bg-canvas text-ink-faint">{t}</Badge>)}
                  </span>
                )}
              </td>
              <td className="td text-ink-soft">{ENTITY_TYPES[e.entity_type]}</td>
              <td className="td text-ink-soft">{e.jurisdiction ?? "—"}</td>
              <td className="td text-ink-soft">{fmtDate(e.formation_date)}</td>
              <td className="td text-ink-soft">{e.client_matter ?? "—"}</td>
              <td className="td"><Badge className={STATUS_STYLES[e.status]}>{ENTITY_STATUSES[e.status]}</Badge></td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title={q || type || status ? "No entities match these filters" : "No entities yet"}
          body={q || type || status ? "Try broadening your search or clearing filters." : "Add your first entity to start building your firm's entity book."}
          action={q || type || status
            ? <Link href="/entities" className="btn-secondary">Clear filters</Link>
            : <Link href="/entities/new" className="btn-primary">Add entity</Link>} />
      )}
    </div>
  );
}
