"use server";

import { revalidatePath } from "next/cache";
import { getSession, createClient } from "@/lib/supabase/server";

async function requireMember() {
  const session = await getSession();
  if (!session?.membership || session.membership.role === "client") throw new Error("Not authorized");
  return { session, orgId: session.membership.organization_id, supabase: createClient() };
}

async function log(supabase: any, orgId: string, userId: string, action: string, detail: string) {
  await supabase.from("activity_logs").insert({ organization_id: orgId, user_id: userId, action, detail });
}

/** Create a new entity from the chart toolbar. */
export async function addEntityNode(input: {
  legal_name: string; entity_type: string; jurisdiction?: string | null; status?: string | null; chart_id?: string | null;
}) {
  const { session, orgId, supabase } = await requireMember();
  const name = input.legal_name?.trim();
  if (!name) return { error: "Legal name is required." };
  const { data, error } = await supabase.from("entities").insert({
    organization_id: orgId,
    legal_name: name,
    entity_type: input.entity_type || "llc",
    jurisdiction: input.jurisdiction?.trim() || null,
    status: input.status || "active",
    created_by: session.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  if (input.chart_id) {
    await supabase.from("org_chart_entities").upsert({ chart_id: input.chart_id, entity_id: data.id });
  }
  await log(supabase, orgId, session.user.id, "entity.created", `Created ${name} from the org chart`);
  revalidatePath("/org-chart");
  return { id: data.id };
}

/** Create an ownership link. Owner is either an existing entity or a named individual/trust. */
export async function addOwnershipLink(input: {
  owned_entity_id: string;
  owner_entity_id?: string | null;
  owner_name: string;
  owner_type: string; // individual | entity | trust | other
  percentage?: number | null;
  share_class?: string | null;
  effective_date?: string | null;
}) {
  const { session, orgId, supabase } = await requireMember();
  if (!input.owned_entity_id) return { error: "Choose which entity is owned." };
  if (!input.owner_name?.trim()) return { error: "Owner name is required." };
  if (input.owner_entity_id && input.owner_entity_id === input.owned_entity_id) {
    return { error: "An entity cannot own itself." };
  }
  // RLS confirms the owned entity belongs to this org
  const { data: owned } = await supabase.from("entities").select("id, legal_name")
    .eq("id", input.owned_entity_id).eq("organization_id", orgId).maybeSingle();
  if (!owned) return { error: "Entity not found." };

  const { error } = await supabase.from("entity_ownership").insert({
    entity_id: input.owned_entity_id,
    owner_entity_id: input.owner_entity_id || null,
    owner_name: input.owner_name.trim(),
    owner_type: input.owner_entity_id ? "entity" : (input.owner_type || "individual"),
    percentage: input.percentage ?? null,
    share_class: input.share_class?.trim() || null,
    effective_date: input.effective_date || null,
  });
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "ownership.created",
    `${input.owner_name.trim()} → ${owned.legal_name}${input.percentage != null ? ` (${input.percentage}%)` : ""}`);
  revalidatePath("/org-chart");
  return { ok: true };
}

/** Remove one ownership link. */
export async function deleteOwnershipLink(id: string) {
  const { session, orgId, supabase } = await requireMember();
  const { data: row } = await supabase.from("entity_ownership")
    .select("id, owner_name, entities:entity_id(organization_id, legal_name)").eq("id", id).maybeSingle();
  const ent: any = row?.entities;
  if (!row || ent?.organization_id !== orgId) return { error: "Link not found." };
  const { error } = await supabase.from("entity_ownership").delete().eq("id", id);
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "ownership.deleted", `Removed ${row.owner_name} → ${ent.legal_name}`);
  revalidatePath("/org-chart");
  return { ok: true };
}

/** Remove every ownership link held by a named individual/trust owner. */
export async function deletePersonOwner(ownerName: string, ownerType: string) {
  const { session, orgId, supabase } = await requireMember();
  const { data: ents } = await supabase.from("entities").select("id").eq("organization_id", orgId);
  const ids = (ents ?? []).map((e) => e.id);
  if (!ids.length) return { ok: true };
  const { error } = await supabase.from("entity_ownership").delete()
    .in("entity_id", ids).is("owner_entity_id", null).eq("owner_name", ownerName).eq("owner_type", ownerType);
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "ownership.deleted", `Removed all holdings of ${ownerName}`);
  revalidatePath("/org-chart");
  return { ok: true };
}

/** Delete an entity (cascades its ownership rows, documents links, etc.). */
export async function deleteEntityNode(id: string) {
  const { session, orgId, supabase } = await requireMember();
  const { data: ent } = await supabase.from("entities").select("id, legal_name")
    .eq("id", id).eq("organization_id", orgId).maybeSingle();
  if (!ent) return { error: "Entity not found." };
  const { error } = await supabase.from("entities").delete().eq("id", id);
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "entity.deleted", `Deleted ${ent.legal_name} from the org chart`);
  revalidatePath("/org-chart");
  return { ok: true };
}


/** ----- Named charts (e.g., one per fund) ----- */

export async function createChart(name: string, description?: string | null) {
  const { session, orgId, supabase } = await requireMember();
  const n = name?.trim();
  if (!n) return { error: "Give the chart a name." };
  const { data, error } = await supabase.from("org_charts").insert({
    organization_id: orgId, name: n, description: description?.trim() || null, created_by: session.user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "orgchart.created", `Created chart "${n}"`);
  revalidatePath("/org-chart");
  return { id: data.id };
}

export async function renameChart(id: string, name: string) {
  const { session, orgId, supabase } = await requireMember();
  const n = name?.trim();
  if (!n) return { error: "Give the chart a name." };
  const { error } = await supabase.from("org_charts").update({ name: n }).eq("id", id).eq("organization_id", orgId);
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "orgchart.renamed", `Renamed chart to "${n}"`);
  revalidatePath("/org-chart");
  return { ok: true };
}

export async function deleteChart(id: string) {
  const { session, orgId, supabase } = await requireMember();
  const { data: c } = await supabase.from("org_charts").select("id, name").eq("id", id).eq("organization_id", orgId).maybeSingle();
  if (!c) return { error: "Chart not found." };
  const { error } = await supabase.from("org_charts").delete().eq("id", id);
  if (error) return { error: error.message };
  await log(supabase, orgId, session.user.id, "orgchart.deleted", `Deleted chart "${c.name}" (entities were not deleted)`);
  revalidatePath("/org-chart");
  return { ok: true };
}

export async function addEntityToChart(chartId: string, entityId: string) {
  const { orgId, supabase } = await requireMember();
  const { data: c } = await supabase.from("org_charts").select("id").eq("id", chartId).eq("organization_id", orgId).maybeSingle();
  if (!c) return { error: "Chart not found." };
  const { error } = await supabase.from("org_chart_entities").upsert({ chart_id: chartId, entity_id: entityId });
  if (error) return { error: error.message };
  revalidatePath("/org-chart");
  return { ok: true };
}

export async function removeEntityFromChart(chartId: string, entityId: string) {
  const { orgId, supabase } = await requireMember();
  const { data: c } = await supabase.from("org_charts").select("id").eq("id", chartId).eq("organization_id", orgId).maybeSingle();
  if (!c) return { error: "Chart not found." };
  const { error } = await supabase.from("org_chart_entities").delete().eq("chart_id", chartId).eq("entity_id", entityId);
  if (error) return { error: error.message };
  revalidatePath("/org-chart");
  return { ok: true };
}

/** Commit a reviewed AI-extracted draft: create missing entities, then links. */
export async function commitExtractedChart(draft: {
  nodes: { name: string; kind: string; entity_type?: string | null; jurisdiction?: string | null; existing_id?: string | null }[];
  links: { owner: string; owned: string; percentage?: number | null; share_class?: string | null }[];
  chart_id?: string | null;
}) {
  const { session, orgId, supabase } = await requireMember();
  const nodes = (draft.nodes ?? []).filter((n) => n.name?.trim());
  const links = (draft.links ?? []).filter((l) => l.owner?.trim() && l.owned?.trim());
  if (!nodes.length) return { error: "Nothing to save — the draft has no names." };

  const norm = (s: string) => s.trim().toLowerCase();
  const validTypes = ["llc","corporation","lp","llp","nonprofit","trust","partnership","foreign_entity","other"];

  // Existing entities by normalized name
  const { data: existing } = await supabase.from("entities").select("id, legal_name").eq("organization_id", orgId);
  const byName = new Map<string, string>();
  for (const e of existing ?? []) byName.set(norm(e.legal_name), e.id);

  // Create entity nodes that don't exist yet
  let created = 0;
  const nodeKind = new Map<string, string>();
  for (const n of nodes) {
    nodeKind.set(norm(n.name), n.kind === "entity" ? "entity" : n.kind || "individual");
    if (n.kind !== "entity") continue;
    const key = norm(n.name);
    if (n.existing_id) { byName.set(key, n.existing_id); continue; }
    if (byName.has(key)) continue;
    const { data, error } = await supabase.from("entities").insert({
      organization_id: orgId,
      legal_name: n.name.trim(),
      entity_type: validTypes.includes(n.entity_type ?? "") ? n.entity_type : "llc",
      jurisdiction: n.jurisdiction?.trim() || null,
      status: "active",
      created_by: session.user.id,
    }).select("id").single();
    if (error) return { error: `Could not create ${n.name}: ${error.message}` };
    byName.set(key, data.id);
    created++;
  }

  // Existing ownership rows, to skip duplicates
  const ids = Array.from(new Set(Array.from(byName.values())));
  const { data: existingLinks } = ids.length
    ? await supabase.from("entity_ownership").select("entity_id, owner_name").in("entity_id", ids)
    : { data: [] as any[] };
  const linkKeys = new Set((existingLinks ?? []).map((l: any) => `${l.entity_id}::${norm(l.owner_name)}`));

  let added = 0, skipped = 0;
  for (const l of links) {
    const ownedId = byName.get(norm(l.owned));
    if (!ownedId) { skipped++; continue; } // owned side must be an entity in the workspace
    const key = `${ownedId}::${norm(l.owner)}`;
    if (linkKeys.has(key)) { skipped++; continue; }
    const ownerEntityId = byName.get(norm(l.owner)) ?? null;
    const kind = nodeKind.get(norm(l.owner)) ?? "individual";
    const { error } = await supabase.from("entity_ownership").insert({
      entity_id: ownedId,
      owner_entity_id: ownerEntityId,
      owner_name: l.owner.trim(),
      owner_type: ownerEntityId ? "entity" : (["individual","trust","other"].includes(kind) ? kind : "individual"),
      percentage: l.percentage ?? null,
      share_class: l.share_class?.trim() || null,
    });
    if (error) { skipped++; continue; }
    linkKeys.add(key);
    added++;
  }

  if (draft.chart_id) {
    const { data: chart } = await supabase.from("org_charts").select("id").eq("id", draft.chart_id).eq("organization_id", orgId).maybeSingle();
    if (chart) {
      // Only entities named in this draft join the chart
      const draftNames = new Set(nodes.map((n) => norm(n.name)));
      const rows = Array.from(byName.entries())
        .filter(([k]) => draftNames.has(k))
        .map(([, eid]) => ({ chart_id: draft.chart_id!, entity_id: eid }));
      if (rows.length) await supabase.from("org_chart_entities").upsert(rows);
    }
  }
  await log(supabase, orgId, session.user.id, "orgchart.imported",
    `AI import: ${created} entit${created === 1 ? "y" : "ies"} created, ${added} ownership link${added === 1 ? "" : "s"} added`);
  revalidatePath("/org-chart");
  return { created, added, skipped };
}
