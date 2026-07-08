import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const AI_SYSTEM_RULES = `You are entiquity Assistant, the AI inside entiquity — an entity management platform for law firms and legal teams.

Rules you must always follow:
- You are a software feature, not a lawyer. NEVER claim to provide legal advice.
- Any generated legal document is a DRAFT that must be reviewed by a qualified attorney before use. Say so whenever you produce one.
- Answer only from the entity records and document excerpts provided as context. If the context does not contain the answer, say what is missing instead of guessing.
- Cite your sources: reference entities by legal name and documents by file name when your answer relies on them.
- Flag uncertainty explicitly. If records look incomplete or inconsistent, point it out.
- Be precise, calm, and concise. Use plain English. Format lists and drafts in Markdown.`;

export function anthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/** Assemble org context (entities, tasks, people, ownership, document text)
 *  for grounding assistant answers. RLS scopes everything to the caller's org. */
export async function buildOrgContext(orgId: string, opts?: { entityId?: string }) {
  const supabase = createClient();
  const entityFilter = opts?.entityId ? { column: "id", value: opts.entityId } : null;

  let entitiesQ = supabase
    .from("entities")
    .select("id, legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter, tags, parent_entity_id")
    .eq("organization_id", orgId)
    .limit(200);
  if (entityFilter) entitiesQ = entitiesQ.eq("id", opts!.entityId!);
  const { data: entities } = await entitiesQ;

  const ids = (entities ?? []).map((e) => e.id);
  const [{ data: tasks }, { data: people }, { data: ownership }, { data: docs }] = await Promise.all([
    supabase.from("compliance_tasks")
      .select("entity_id, name, task_type, due_date, status, priority")
      .eq("organization_id", orgId).in("entity_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).limit(300),
    supabase.from("entity_people")
      .select("entity_id, name, role, title, start_date, end_date")
      .in("entity_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).limit(300),
    supabase.from("entity_ownership")
      .select("entity_id, owner_name, owner_type, percentage, units, effective_date")
      .in("entity_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).limit(300),
    supabase.from("documents")
      .select("entity_id, name, category, extracted_text")
      .eq("organization_id", orgId).in("entity_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).limit(100),
  ]);

  const byEntity = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.entity_id === id);
  const lines: string[] = [];
  for (const e of entities ?? []) {
    lines.push(`## ENTITY: ${e.legal_name}`);
    lines.push(`Type: ${e.entity_type} | Jurisdiction: ${e.jurisdiction ?? "unknown"} | Formed: ${e.formation_date ?? "unknown"} | Status: ${e.status} | EIN: ${e.ein ?? "not on file"} | Registered agent: ${e.registered_agent ?? "not on file"} | Client/matter: ${e.client_matter ?? "—"}`);
    const ppl = byEntity(people, e.id);
    if (ppl.length) lines.push("People: " + ppl.map((p) => `${p.name} (${p.title || p.role}${p.end_date ? ", ended " + p.end_date : ""})`).join("; "));
    const own = byEntity(ownership, e.id);
    if (own.length) lines.push("Ownership: " + own.map((o) => `${o.owner_name} ${o.percentage ?? "?"}%`).join("; "));
    const tk = byEntity(tasks, e.id);
    if (tk.length) lines.push("Compliance tasks: " + tk.map((t) => `${t.name} due ${t.due_date} [${t.status}]`).join("; "));
    const dd = byEntity(docs, e.id);
    for (const d of dd) {
      lines.push(`Document "${d.name}" (${d.category})${d.extracted_text ? ": " + String(d.extracted_text).slice(0, 1200) : " (no text extracted)"}`);
    }
    lines.push("");
  }
  return lines.join("\n").slice(0, 120000);
}
