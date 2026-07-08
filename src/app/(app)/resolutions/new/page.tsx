import { getSession, createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import DraftingStudio from "@/components/drafting-studio";

export const dynamic = "force-dynamic";

export default async function NewResolutionPage({ searchParams }: { searchParams: { entity?: string } }) {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const supabase = createClient();
  const { data: entities } = await supabase.from("entities")
    .select("id, legal_name, entity_type, jurisdiction").eq("organization_id", orgId).order("legal_name");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Draft a resolution"
        description="Pick an entity and document type, describe the action, and entiquity drafts it from your records." />
      <DraftingStudio entities={entities ?? []} preselect={searchParams.entity} />
    </div>
  );
}
