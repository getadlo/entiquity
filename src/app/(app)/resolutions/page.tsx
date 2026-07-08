import Link from "next/link";
import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Table, EmptyState, Disclaimer } from "@/components/ui";
import { RESOLUTION_TYPES, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResolutionsPage({ searchParams }: { searchParams: { open?: string } }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();

  const { data: resolutions } = await supabase.from("resolutions")
    .select("id, title, resolution_type, status, created_at, entities(id, legal_name)")
    .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(200);

  const open = searchParams.open
    ? (await supabase.from("resolutions").select("*, entities(legal_name)").eq("id", searchParams.open).maybeSingle()).data
    : null;

  return (
    <div>
      <PageHeader title="Resolutions" description="Board resolutions, consents, minutes, and certificates — drafted with AI, stored per entity."
        actions={<Link href="/resolutions/new" className="btn-primary">Draft new</Link>} />

      {open && (
        <div className="card mb-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{open.title}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                {(open as any).entities?.legal_name} · {RESOLUTION_TYPES[open.resolution_type]} · {fmtDate(open.created_at)}
              </p>
            </div>
            <Badge className={open.status === "final" ? "bg-accent-soft text-accent" : "bg-amber-50 text-warn"}>{open.status}</Badge>
          </div>
          <div className="mt-4 whitespace-pre-wrap rounded-lg bg-canvas p-5 font-serif text-sm leading-relaxed">{open.body_md}</div>
          <p className="mt-3 text-xs text-ink-faint">
            Generated documents are drafts and should be reviewed by qualified legal counsel before use.
          </p>
        </div>
      )}

      {resolutions?.length ? (
        <Table head={["Title", "Entity", "Type", "Status", "Created"]}>
          {resolutions.map((r: any) => (
            <tr key={r.id} className="hover:bg-canvas/60">
              <td className="td"><Link href={`/resolutions?open=${r.id}`} className="font-medium hover:text-accent">{r.title}</Link></td>
              <td className="td text-ink-soft">{r.entities?.legal_name ?? "—"}</td>
              <td className="td text-ink-soft">{RESOLUTION_TYPES[r.resolution_type]}</td>
              <td className="td"><Badge className={r.status === "final" ? "bg-accent-soft text-accent" : "bg-amber-50 text-warn"}>{r.status}</Badge></td>
              <td className="td text-ink-soft">{fmtDate(r.created_at)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No resolutions yet" body="Draft a board resolution, written consent, or annual meeting minutes with AI — pre-filled from your entity records."
          action={<Link href="/resolutions/new" className="btn-primary">Draft a resolution</Link>} />
      )}
      <Disclaimer />
    </div>
  );
}
