"use client";
import { useState } from "react";

export default function AISummary({ entityId, entityName }: { entityId: string; entityName: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Summary failed");
      setSummary(data.summary);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">AI Summary</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            A plain-English briefing on {entityName}: what it is, key people, ownership,
            upcoming deadlines, missing records, and potential compliance risks.
          </p>
        </div>
        <button onClick={generate} disabled={busy} className="btn-primary shrink-0">
          {busy ? "Analyzing…" : summary ? "Regenerate" : "Generate summary"}
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {summary && (
        <div className="prose-sm mt-5 whitespace-pre-wrap rounded-lg bg-canvas p-5 text-sm leading-relaxed">{summary}</div>
      )}
      <p className="mt-4 text-xs text-ink-faint">
        AI-generated content based on this entity's records. Not legal advice — verify against source documents.
      </p>
    </div>
  );
}
