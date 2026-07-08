import { NextResponse } from "next/server";
import { getSession, createClient } from "@/lib/supabase/server";

// Serves documents only through short-lived signed URLs; RLS on the documents
// table gates who can request one (staff, or clients with shared access).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

  const supabase = createClient();
  const { data: doc } = await supabase.from("documents")
    .select("storage_path, name").eq("id", id).maybeSingle(); // RLS applies here
  if (!doc?.storage_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.storage.from("documents")
    .createSignedUrl(doc.storage_path, 60, { download: doc.name });
  if (error || !data) return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
