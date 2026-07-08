import { getSession, createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Table, EmptyState } from "@/components/ui";
import { DOC_CATEGORIES, fmtBytes, fmtDate } from "@/lib/utils";
import DocumentUpload from "@/components/document-upload";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();
  const q = searchParams.q?.trim();
  const category = searchParams.category;

  let query = supabase.from("documents")
    .select("id, name, category, size_bytes, created_at, storage_path, shared_with_client, entities(id, legal_name)")
    .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(500);
  if (q) query = query.or(`name.ilike.%${q}%,extracted_text.ilike.%${q}%`);
  if (category) query = query.eq("category", category);
  const { data: docs } = await query;

  return (
    <div>
      <PageHeader title="Documents" description="Every file across every entity — searchable by name and content." />
      <div className="mb-4"><DocumentUpload orgId={orgId} /></div>
      <form className="mb-4 flex flex-wrap gap-2" action="/documents" method="get">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search file names and document text…" aria-label="Search documents" />
        <select name="category" defaultValue={category ?? ""} className="input w-auto" aria-label="Category">
          <option value="">All categories</option>
          {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secondary">Search</button>
      </form>
      {docs?.length ? (
        <Table head={["Document", "Entity", "Category", "Size", "Uploaded", ""]}>
          {docs.map((d: any) => (
            <tr key={d.id} className="hover:bg-canvas/60">
              <td className="td font-medium">{d.name} {d.shared_with_client && <Badge className="ml-1 bg-accent-soft text-accent">Shared</Badge>}</td>
              <td className="td">{d.entities ? <Link href={`/entities/${d.entities.id}?tab=documents`} className="text-accent hover:underline">{d.entities.legal_name}</Link> : <span className="text-ink-faint">Unassigned</span>}</td>
              <td className="td text-ink-soft">{DOC_CATEGORIES[d.category]}</td>
              <td className="td text-ink-soft">{fmtBytes(d.size_bytes)}</td>
              <td className="td text-ink-soft">{fmtDate(d.created_at)}</td>
              <td className="td">{d.storage_path && <a className="text-sm font-medium text-accent hover:underline" href={`/api/documents/sign?id=${d.id}`}>Download</a>}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title={q ? "No documents match" : "No documents yet"}
          body={q ? "Try different keywords — content search covers extracted document text." : "Upload your first document above. Assign it to an entity from the entity's Documents tab."} />
      )}
    </div>
  );
}
