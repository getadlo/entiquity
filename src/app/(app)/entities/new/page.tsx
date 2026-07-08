import { redirect } from "next/navigation";
import { getSession, createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ENTITY_STATUSES, ENTITY_TYPES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewEntityPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();
  const { data: parents } = await supabase
    .from("entities").select("id, legal_name").eq("organization_id", orgId).order("legal_name");

  async function createEntity(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session?.membership) redirect("/login");
    const orgId = session.membership.organization_id;
    const supabase = createClient();

    const get = (k: string) => (formData.get(k) as string)?.trim() || null;
    const { data: entity, error } = await supabase.from("entities").insert({
      organization_id: orgId,
      legal_name: get("legal_name"),
      entity_type: get("entity_type") ?? "llc",
      jurisdiction: get("jurisdiction"),
      formation_date: get("formation_date"),
      status: get("status") ?? "active",
      ein: get("ein"),
      registered_agent: get("registered_agent"),
      client_matter: get("client_matter"),
      internal_notes: get("internal_notes"),
      parent_entity_id: get("parent_entity_id"),
      tags: get("tags")?.split(",").map((t) => t.trim()).filter(Boolean) ?? [],
      created_by: session.user.id,
    }).select("id").single();
    if (error) throw new Error(error.message);

    const addr = {
      line1: get("addr_line1"), city: get("addr_city"),
      region: get("addr_region"), postal_code: get("addr_postal"),
    };
    if (addr.line1 || addr.city) {
      await supabase.from("entity_addresses").insert({ entity_id: entity.id, kind: "principal_office", ...addr });
    }
    const mail = { line1: get("mail_line1"), city: get("mail_city"), region: get("mail_region"), postal_code: get("mail_postal") };
    if (mail.line1 || mail.city) {
      await supabase.from("entity_addresses").insert({ entity_id: entity.id, kind: "mailing", ...mail });
    }
    await supabase.from("activity_logs").insert({
      organization_id: orgId, entity_id: entity.id, actor_id: session.user.id,
      action: "entity.created", detail: `${get("legal_name")} added`,
    });
    redirect(`/entities/${entity.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add entity" description="Core details now — people, ownership, and documents from the entity profile." />
      <form action={createEntity} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="legal_name">Legal name</label>
          <input id="legal_name" name="legal_name" required className="input" placeholder="Acme Holdings LLC" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="entity_type">Entity type</label>
            <select id="entity_type" name="entity_type" className="input">
              {Object.entries(ENTITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input">
              {Object.entries(ENTITY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="jurisdiction">Jurisdiction</label>
            <input id="jurisdiction" name="jurisdiction" className="input" placeholder="Delaware" />
          </div>
          <div>
            <label className="label" htmlFor="formation_date">Formation date</label>
            <input id="formation_date" name="formation_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="ein">EIN / tax ID</label>
            <input id="ein" name="ein" className="input" placeholder="82-1194407" />
          </div>
          <div>
            <label className="label" htmlFor="registered_agent">Registered agent</label>
            <input id="registered_agent" name="registered_agent" className="input" placeholder="CT Corporation System" />
          </div>
          <div>
            <label className="label" htmlFor="client_matter">Client / matter</label>
            <input id="client_matter" name="client_matter" className="input" placeholder="Acme / 2024-081" />
          </div>
          <div>
            <label className="label" htmlFor="parent_entity_id">Parent entity</label>
            <select id="parent_entity_id" name="parent_entity_id" className="input">
              <option value="">None</option>
              {(parents ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.legal_name}</option>)}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="label">Principal office address</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            <input name="addr_line1" className="input sm:col-span-4" placeholder="Street" aria-label="Street" />
            <input name="addr_city" className="input sm:col-span-2" placeholder="City" aria-label="City" />
            <input name="addr_region" className="input" placeholder="State" aria-label="State" />
            <input name="addr_postal" className="input" placeholder="ZIP" aria-label="ZIP" />
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Mailing address (if different)</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            <input name="mail_line1" className="input sm:col-span-4" placeholder="Street or PO box" aria-label="Street" />
            <input name="mail_city" className="input sm:col-span-2" placeholder="City" aria-label="City" />
            <input name="mail_region" className="input" placeholder="State" aria-label="State" />
            <input name="mail_postal" className="input" placeholder="ZIP" aria-label="ZIP" />
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="tags">Tags (comma separated)</label>
          <input id="tags" name="tags" className="input" placeholder="holding, delaware" />
        </div>
        <div>
          <label className="label" htmlFor="internal_notes">Internal notes</label>
          <textarea id="internal_notes" name="internal_notes" rows={3} className="input" placeholder="Never visible to clients." />
        </div>
        <div className="flex justify-end gap-2">
          <a href="/entities" className="btn-secondary">Cancel</a>
          <button className="btn-primary">Create entity</button>
        </div>
      </form>
    </div>
  );
}
