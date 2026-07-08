"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DOC_CATEGORIES } from "@/lib/utils";

export default function DocumentUpload({ orgId, entityId }: { orgId: string; entityId?: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Choose a file first.");
    if (file.size > 25 * 1024 * 1024) return setError("Files must be under 25 MB.");
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Org-scoped path enforces storage RLS: {orgId}/{timestamp}-{name}
    const path = `${orgId}/${Date.now()}-${file.name.replace(/[^\w.\-() ]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { setBusy(false); return setError(upErr.message); }

    // Extract text for AI search (plain text files client-side; PDFs indexed server-side later)
    let extracted: string | null = null;
    if (file.type.startsWith("text/")) extracted = (await file.text()).slice(0, 100000);

    const { error: dbErr } = await supabase.from("documents").insert({
      organization_id: orgId, entity_id: entityId ?? null, name: file.name,
      category, storage_path: path, mime_type: file.type, size_bytes: file.size,
      extracted_text: extracted, uploaded_by: user?.id,
    });
    if (dbErr) { setBusy(false); return setError(dbErr.message); }
    await supabase.from("activity_logs").insert({
      organization_id: orgId, entity_id: entityId ?? null, actor_id: user?.id,
      action: "document.uploaded", detail: file.name,
    });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.csv"
        className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent"
        aria-label="Choose file" />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto" aria-label="Document category">
        {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <button onClick={upload} disabled={busy} className="btn-primary">{busy ? "Uploading…" : "Upload"}</button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
