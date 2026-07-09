import { getSession, createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ENTITY_TYPES } from "@/lib/utils";
import OrgChartView from "@/components/org-chart-view";
import ExportButton from "@/components/export-button";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();

  const { data: entities } = await supabase
    .from("entities")
    .select("id, legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter, parent_entity_id")
    .eq("organization_id", orgId)
    .order("legal_name")
    .limit(500);

  const ids = (entities ?? []).map((e) => e.id);
  const { data: ownership } = ids.length
    ? await supabase
        .from("entity_ownership")
        .select("id, entity_id, owner_name, owner_type, owner_entity_id, percentage, units, share_class, effective_date, notes")
        .in("entity_id", ids)
        .limit(1000)
    : { data: [] as any[] };

  const nameById = new Map((entities ?? []).map((e) => [e.id, e.legal_name]));
  const exportRows = (ownership ?? []).map((o: any) => ({
    owner: o.owner_name,
    owner_type: o.owner_type === "entity" ? "Entity" : o.owner_type === "trust" ? "Trust" : o.owner_type === "other" ? "Other" : "Individual",
    owned: nameById.get(o.entity_id) ?? "",
    percentage: o.percentage ?? "",
    share_class: o.share_class ?? "",
    effective_date: o.effective_date ?? "",
  }));
  const soloEntities = (entities ?? [])
    .filter((e) => !(ownership ?? []).some((o: any) => o.entity_id === e.id || o.owner_entity_id === e.id))
    .map((e) => ({ owner: "", owner_type: "", owned: e.legal_name, percentage: "", share_class: "", effective_date: "" }));

  return (
    <div>
      <PageHeader
        title="Org chart"
        description="The whole ownership structure at a glance — click any box to see and edit its details."
        actions={
          <ExportButton
            rows={[...exportRows, ...soloEntities]}
            columns={[
              { key: "owner", label: "Owner" },
              { key: "owner_type", label: "Owner type" },
              { key: "owned", label: "Owned entity" },
              { key: "percentage", label: "%" },
              { key: "share_class", label: "Share class" },
              { key: "effective_date", label: "Effective date" },
            ]}
            filename="entiquity-org-chart"
            title="Org chart"
          />
        }
      />
      <OrgChartView
        entities={(entities ?? []) as any}
        ownership={(ownership ?? []) as any}
      />
    </div>
  );
}
