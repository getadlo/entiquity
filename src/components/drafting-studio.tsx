"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RESOLUTION_TYPES } from "@/lib/utils";

export default function DraftingStudio({
  entities, preselect,
}: { entities: { id: string; legal_name: string }[]; preselect?: string }) {
  const router = useRouter();
  const [entityId, setEntityId] = useState(preselect ?? entities[0]?.id ?? "");
  const [type, setType] = useState("board_resolution");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!entityId || !details.trim()) return setError("Pick an entity and describe the action to approve.");
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, type, title, details, effectiveDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Drafting failed");
      setDraft(data.draft);
      if (!title) setTitle(data.suggestedTitle ?? RESOLUTION_TYPES[type]);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  async function save(status: "draft" | "final") {
    if (!draft.trim()) return;
    setSaving(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = await supabase.from("memberships")
      .select("organization_id").eq("user_id", user!.id).limit(1).single();
    const { data: row, error } = await supabase.from("resolutions").insert({
      organization_id: membership!.organization_id, entity_id: entityId,
      title: title || RESOLUTION_TYPES[type], resolution_type: type, body_md: draft, status,
      created_by: user!.id,
    }).select("id").single();
    if (error) { setSaving(false); return setError(error.message); }
    await supabase.from("activity_logs").insert({
      organization_id: membership!.organization_id, entity_id: entityId, actor_id: user!.id,
      action: "resolution.created", detail: title || RESOLUTION_TYPES[type],
    });
    setSaving(false);
    router.push(`/resolutions?open=${row.id}`);
  }

  function exportFile(ext: "md" | "doc") {
    const blob = new Blob(
      [ext === "doc" ? `<html><body><pre style="font-family:Georgia,serif;white-space:pre-wrap">${draft.replace(/</g, "&lt;")}</pre></body></html>` : draft],
      { type: ext === "doc" ? "application/msword" : "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || "resolution").replace(/[^\w -]/g, "")}.${ext === "doc" ? "doc" : "md"}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="entity">Entity</label>
            <select id="entity" className="input" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.legal_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="type">Document type</label>
            <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(RESOLUTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="title">Title (optional)</label>
            <input id="title" className="input" placeholder="e.g. Approval of new bank account" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="date">Effective date</label>
            <input id="date" type="date" className="input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="details">What is being approved?</label>
          <textarea id="details" rows={3} className="input"
            placeholder='e.g. "Open a business checking account at First Meridian Bank; authorize the President and Treasurer as signatories."'
            value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button onClick={generate} disabled={busy} className="btn-primary">
          {busy ? "Drafting…" : draft ? "Regenerate draft" : "Generate draft"}
        </button>
      </div>

      {draft && (
        <div className="card p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Draft — edit before saving</h2>
            <div className="flex gap-2">
              <button onClick={() => exportFile("doc")} className="btn-secondary">Export DOCX</button>
              <button onClick={() => exportFile("md")} className="btn-secondary">Export Markdown</button>
              <button onClick={() => save("draft")} disabled={saving} className="btn-secondary">Save draft</button>
              <button onClick={() => save("final")} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save as final"}</button>
            </div>
          </div>
          <textarea rows={22} className="input font-serif leading-relaxed" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Draft body" />
          <p className="mt-3 text-xs text-ink-faint">
            Generated documents are drafts and should be reviewed by qualified legal counsel before use.
          </p>
        </div>
      )}
    </div>
  );
}
