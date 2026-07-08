import { getSession, createClient } from "@/lib/supabase/server";

function csv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.membership || session.membership.role === "client") {
    return new Response("Not authorized", { status: 401 });
  }
  const orgId = session.membership.organization_id;
  const report = new URL(req.url).searchParams.get("report") ?? "entities";
  const supabase = createClient();
  let body = "";

  if (report === "deadlines") {
    const { data } = await supabase.from("compliance_tasks")
      .select("name, task_type, due_date, status, priority, entities(legal_name)")
      .eq("organization_id", orgId).order("due_date");
    body = csv([["Task","Entity","Type","Due date","Status","Priority"],
      ...(data ?? []).map((t: any) => [t.name, t.entities?.legal_name ?? "", t.task_type, t.due_date, t.status, t.priority])]);
  } else {
    const { data } = await supabase.from("entities")
      .select("legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter")
      .eq("organization_id", orgId).order("legal_name");
    body = csv([["Legal name","Type","Jurisdiction","Formation date","Status","EIN","Registered agent","Client/matter"],
      ...(data ?? []).map((e: any) => [e.legal_name, e.entity_type, e.jurisdiction, e.formation_date, e.status, e.ein, e.registered_agent, e.client_matter])]);
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="entiquity-${report}.csv"`,
    },
  });
}
