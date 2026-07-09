"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ExportColumn = { key: string; label: string };
type Format = "csv" | "xlsx" | "pdf";

/** Universal export: any page passes its visible (already-filtered) rows +
 *  column definitions; the person picks a format, columns, and rows. */
export default function ExportButton({
  rows, columns, filename, title, label = "Export",
}: {
  rows: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;      // without extension
  title: string;         // heading on the PDF
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("csv");
  const [cols, setCols] = useState<Set<string>>(new Set(columns.map((c) => c.key)));
  const [picked, setPicked] = useState<Set<number>>(new Set(rows.map((_, i) => i)));
  const [busy, setBusy] = useState(false);

  const allRows = picked.size === rows.length;
  const activeCols = useMemo(() => columns.filter((c) => cols.has(c.key)), [columns, cols]);

  function toggleCol(k: string) {
    setCols((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }
  function toggleRow(i: number) {
    setPicked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function cell(r: Record<string, any>, k: string): string {
    const v = r[k];
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  }

  async function run() {
    if (!activeCols.length || !picked.size) return;
    setBusy(true);
    try {
      const data = rows.filter((_, i) => picked.has(i));
      const header = activeCols.map((c) => c.label);
      const body = data.map((r) => activeCols.map((c) => cell(r, c.key)));

      if (format === "csv") {
        const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
        const csv = [header, ...body].map((row) => row.map(esc).join(",")).join("\n");
        download(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
      } else if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
        ws["!cols"] = activeCols.map((c, i) => ({
          wch: Math.min(48, Math.max(c.label.length, ...body.map((r) => (r[i] ?? "").length), 10)),
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const landscape = activeCols.length > 5;
        const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt" });
        const w = doc.internal.pageSize.getWidth();
        // Brand header: deep pine bar with the wordmark
        doc.setFillColor(8, 49, 42);
        doc.rect(0, 0, w, 54, "F");
        doc.setFont("times", "bold"); doc.setTextColor(0, 228, 124); doc.setFontSize(18);
        doc.text("entiquity", 40, 34);
        doc.setFont("helvetica", "normal"); doc.setTextColor(255, 255, 255); doc.setFontSize(10);
        doc.text(`${title} — exported ${new Date().toLocaleDateString()}`, w - 40, 34, { align: "right" });
        autoTable(doc, {
          head: [header], body,
          startY: 70, margin: { left: 40, right: 40 },
          styles: { fontSize: 8.5, textColor: [13, 27, 22], lineColor: [227, 233, 229], lineWidth: 0.5 },
          headStyles: { fillColor: [8, 49, 42], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 248, 246] },
        });
        doc.save(`${filename}.pdf`);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)} disabled={!rows.length}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Close export dialog" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="card relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold">Export {title.toLowerCase()}</h2>
              <button className="btn-ghost" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* Format */}
              <div className="label">Format</div>
              <div className="flex gap-2">
                {(["csv", "xlsx", "pdf"] as Format[]).map((f) => (
                  <button key={f} type="button" onClick={() => setFormat(f)}
                    className={cn("rounded-lg border px-4 py-2 text-sm font-medium transition",
                      format === f ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft hover:border-ink-faint")}>
                    {f === "csv" ? "CSV" : f === "xlsx" ? "Excel" : "PDF"}
                  </button>
                ))}
              </div>

              {/* Columns */}
              <div className="label mt-5">Columns ({activeCols.length} of {columns.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((c) => (
                  <button key={c.key} type="button" onClick={() => toggleCol(c.key)}
                    className={cn("badge border transition",
                      cols.has(c.key) ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-ink-faint hover:text-ink-soft")}>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Rows */}
              <div className="mt-5 flex items-center justify-between">
                <div className="label mb-0">Rows ({picked.size} of {rows.length})</div>
                <button type="button" className="text-xs font-medium text-accent hover:underline"
                  onClick={() => setPicked(allRows ? new Set() : new Set(rows.map((_, i) => i)))}>
                  {allRows ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-line">
                {rows.map((r, i) => (
                  <label key={i} className={cn("flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-sm last:border-b-0",
                    picked.has(i) ? "bg-white" : "bg-canvas/60 text-ink-faint")}>
                    <input type="checkbox" checked={picked.has(i)} onChange={() => toggleRow(i)}
                      className="h-4 w-4 rounded border-line accent-[#08312A]" />
                    <span className="truncate">{cell(r, columns[0].key) || "(blank)"}</span>
                    <span className="ml-auto shrink-0 truncate text-xs text-ink-faint">{columns[1] ? cell(r, columns[1].key) : ""}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line bg-canvas/50 px-5 py-3">
              <span className="text-xs text-ink-faint">{picked.size} row{picked.size === 1 ? "" : "s"} · {activeCols.length} column{activeCols.length === 1 ? "" : "s"} · {format.toUpperCase()}</span>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={run} disabled={busy || !picked.size || !activeCols.length}>
                  {busy ? "Exporting…" : "Export"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
