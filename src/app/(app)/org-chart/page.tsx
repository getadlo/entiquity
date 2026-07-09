import { getSession, createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ENTITY_TYPES } from "@/lib/utils";
import OrgChartView from "@/components/org-chart-view";
import ExportButton from "@/components/export-button";

export const dynamic = "force-dynamic";

export default async function OrgChartPage({ searchParams }: { searchParams: { chart?: string } }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();

  const { data: charts } = await supabase
    .from("org_charts")
    .select("id, name, description")
    .eq("organization_id", orgId)
    .order("created_at");

  const activeChart = searchParams.chart && (charts ?? []).some((c) => c.id === searchParams.chart)
    ? searchParams.chart
    : null;

  const { data: allEntities } = await supabase
    .from("entities")
    .select("id, legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter, parent_entity_id")
    .eq("organization_id", orgId)
    .order("legal_name")
    .limit(500);

  let entities = allEntities ?? [];
  if (activeChart) {
    const { data: members } = await supabase
      .from("org_chart_entities").select("entity_id").eq("chart_id", activeChart);
    const memberIds = new Set((members ?? []).map((m) => m.entity_id));
    entities = entities.filter((e) => memberIds.has(e.id));
  }

  const ids = entities.map((e) => e.id);
  const { data: ownership } = ids.length
    ? await supabase
        .from("entity_ownership")
        .select("id, entity_id, owner_name, owner_type, owner_entity_id, percentage, units, share_class, effective_date, notes")
        .in("entity_id", ids)
        .limit(1000)
    : { data: [] as any[] };

  const nameById = new Map(entities.map((e) => [e.id, e.legal_name]));
  const exportRows = (ownership ?? []).map((o: any) => ({
    owner: o.owner_name,
    owner_type: o.owner_type === "entity" ? "Entity" : o.owner_type === "trust" ? "Trust" : o.owner_type === "other" ? "Other" : "Individual",
    owned: nameById.get(o.entity_id) ?? "",
    percentage: o.percentage ?? "",
    share_class: o.share_class ?? "",
    effective_date: o.effective_date ?? "",
  }));
  const soloEntities = entities
    .filter((e) => !(ownership ?? []).some((o: any) => o.entity_id === e.id || o.owner_entity_id === e.id))
    .map((e) => ({ owner: "", owner_type: "", owned: e.legal_name, percentage: "", share_class: "", effective_date: "" }));

  return (
    <div>
      <PageHeader
        title={activeChart ? `Org chart · ${(charts ?? []).find((c) => c.id === activeChart)?.name}` : "Org chart"}
        description="The whole ownership structure at a glance — click any box to see and edit its details. Create separate named charts for each fund, deal, or client group."
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
            filename={activeChart ? `entiquity-org-chart-${((charts ?? []).find((c) => c.id === activeChart)?.name ?? "chart").toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "entiquity-org-chart"}
            title={activeChart ? ((charts ?? []).find((c) => c.id === activeChart)?.name ?? "Org chart") : "Org chart"}
          />
        }
      />
      <OrgChartView
        entities={entities as any}
        allEntities={(allEntities ?? []) as any}
        ownership={(ownership ?? []) as any}
        charts={(charts ?? []) as any}
        activeChart={activeChart}
      />
    </div>
  );
}
