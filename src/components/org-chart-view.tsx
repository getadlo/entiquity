"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn, ENTITY_TYPES, ENTITY_STATUSES, fmtDate } from "@/lib/utils";
import {
  addEntityNode, addOwnershipLink, deleteOwnershipLink, deletePersonOwner,
  deleteEntityNode, commitExtractedChart, createChart, renameChart, deleteChart,
  addEntityToChart, removeEntityFromChart,
} from "@/app/(app)/org-chart/actions";

/* ---------- types ---------- */
type EntityRow = {
  id: string; legal_name: string; entity_type: string; jurisdiction: string | null;
  formation_date: string | null; status: string; ein: string | null;
  registered_agent: string | null; client_matter: string | null; parent_entity_id: string | null;
};
type OwnRow = {
  id: string; entity_id: string; owner_name: string; owner_type: string;
  owner_entity_id: string | null; percentage: number | null; units: number | null;
  share_class: string | null; effective_date: string | null; notes: string | null;
};
type Node = { id: string; kind: "entity" | "person"; label: string; sub: string; entity?: EntityRow; ownerType?: string; x: number; y: number; layer: number };
type Edge = { id: string; from: string; to: string; pct: number | null; row: OwnRow };
type DraftNode = { name: string; kind: string; entity_type: string | null; jurisdiction: string | null; existing_id: string | null };
type DraftLink = { owner: string; owned: string; percentage: number | null; share_class: string | null };

const NODE_W = 196, NODE_H = 62, GAP_X = 34, GAP_Y = 96;
const personKey = (name: string, type: string) => `p:${type}:${name.trim().toLowerCase()}`;

/* ---------- layout ---------- */
function buildGraph(entities: EntityRow[], ownership: OwnRow[]) {
  const nodes = new Map<string, Node>();
  for (const e of entities) {
    nodes.set(e.id, {
      id: e.id, kind: "entity", label: e.legal_name,
      sub: [ENTITY_TYPES[e.entity_type] ?? e.entity_type, e.jurisdiction].filter(Boolean).join(" · "),
      entity: e, x: 0, y: 0, layer: 0,
    });
  }
  const edges: Edge[] = [];
  const seenPair = new Set<string>();
  for (const o of ownership) {
    if (!nodes.has(o.entity_id)) continue;
    let from: string;
    if (o.owner_entity_id && nodes.has(o.owner_entity_id)) {
      from = o.owner_entity_id;
    } else {
      from = personKey(o.owner_name, o.owner_type);
      if (!nodes.has(from)) {
        nodes.set(from, {
          id: from, kind: "person", label: o.owner_name,
          sub: o.owner_type === "trust" ? "Trust" : o.owner_type === "other" ? "Other owner" : "Individual",
          ownerType: o.owner_type, x: 0, y: 0, layer: 0,
        });
      }
    }
    edges.push({ id: o.id, from, to: o.entity_id, pct: o.percentage, row: o });
    seenPair.add(`${from}->${o.entity_id}`);
  }
  // Parent links (structure only) where no ownership row covers the pair
  for (const e of entities) {
    if (e.parent_entity_id && nodes.has(e.parent_entity_id) && !seenPair.has(`${e.parent_entity_id}->${e.id}`)) {
      edges.push({ id: `parent-${e.id}`, from: e.parent_entity_id, to: e.id, pct: null, row: null as any });
    }
  }

  // Layers: owners above what they own (cycle-safe)
  const incoming = new Map<string, string[]>();
  for (const ed of edges) {
    if (!incoming.has(ed.to)) incoming.set(ed.to, []);
    incoming.get(ed.to)!.push(ed.from);
  }
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  function calc(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const owners = incoming.get(id) ?? [];
    const d = owners.length ? Math.max(...owners.map(calc)) + 1 : 0;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }
  for (const id of Array.from(nodes.keys())) calc(id);

  // Position: group per layer, sort so children sit near their owners
  const layers = new Map<number, Node[]>();
  for (const n of Array.from(nodes.values())) {
    n.layer = depth.get(n.id) ?? 0;
    if (!layers.has(n.layer)) layers.set(n.layer, []);
    layers.get(n.layer)!.push(n);
  }
  const orderIndex = new Map<string, number>();
  const layerNums = Array.from(layers.keys()).sort((a, b) => a - b);
  for (const ln of layerNums) {
    const row = layers.get(ln)!;
    row.sort((a, b) => {
      const pa = (incoming.get(a.id) ?? []).map((o) => orderIndex.get(o) ?? 0);
      const pb = (incoming.get(b.id) ?? []).map((o) => orderIndex.get(o) ?? 0);
      const ma = pa.length ? pa.reduce((s, v) => s + v, 0) / pa.length : 0;
      const mb = pb.length ? pb.reduce((s, v) => s + v, 0) / pb.length : 0;
      return ma - mb || a.label.localeCompare(b.label);
    });
    row.forEach((n, i) => {
      orderIndex.set(n.id, i);
      n.x = (i - (row.length - 1) / 2) * (NODE_W + GAP_X);
      n.y = ln * (NODE_H + GAP_Y);
    });
  }
  return { nodes, edges };
}

/* ---------- component ---------- */
type Chart = { id: string; name: string; description: string | null };

export default function OrgChartView({ entities, allEntities, ownership, charts, activeChart }: {
  entities: EntityRow[]; allEntities: EntityRow[]; ownership: OwnRow[]; charts: Chart[]; activeChart: string | null;
}) {
  const router = useRouter();
  const current = activeChart ? charts.find((c) => c.id === activeChart) ?? null : null;
  const { nodes, edges } = useMemo(() => buildGraph(entities, ownership), [entities, ownership]);
  const nodeList = Array.from(nodes.values());

  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<"details" | "add-entity" | "add-link" | "import" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  /* viewport */
  const svgRef = useRef<SVGSVGElement>(null);
  const bounds = useMemo(() => {
    if (!nodeList.length) return { minX: -400, minY: -60, w: 800, h: 400 };
    const xs = nodeList.map((n) => n.x), ys = nodeList.map((n) => n.y);
    const minX = Math.min(...xs) - NODE_W / 2 - 60, maxX = Math.max(...xs) + NODE_W / 2 + 60;
    const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + NODE_H + 60;
    return { minX, minY, w: Math.max(maxX - minX, 600), h: Math.max(maxY - minY, 360) };
  }, [nodeList]);
  const [view, setView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const vb = view ?? { x: bounds.minX, y: bounds.minY, w: bounds.w, h: bounds.h };
  const drag = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);

  function zoom(f: number) {
    setView({ x: vb.x + (vb.w - vb.w * f) / 2, y: vb.y + (vb.h - vb.h * f) / 2, w: vb.w * f, h: vb.h * f });
  }
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, vx: vb.x, vy: vb.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !svgRef.current) return;
    const scale = vb.w / svgRef.current.clientWidth;
    setView({ ...vb, x: drag.current.vx - (e.clientX - drag.current.px) * scale, y: drag.current.vy - (e.clientY - drag.current.py) * scale });
  }

  const sel = selected ? nodes.get(selected) : null;
  const selOwners = sel ? edges.filter((e) => e.to === sel.id && e.row) : [];
  const selHoldings = sel ? edges.filter((e) => e.from === sel.id && e.row) : [];

  async function act<T extends { error?: string }>(fn: () => Promise<T>, okMsg?: string) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fn();
      if (r?.error) setErr(r.error);
      else { if (okMsg) setMsg(okMsg); router.refresh(); }
      return r;
    } finally { setBusy(false); }
  }

  /* PNG snapshot */
  async function downloadPng() {
    const svg = svgRef.current; if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("viewBox", `${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`);
    clone.setAttribute("width", String(bounds.w * 2)); clone.setAttribute("height", String(bounds.h * 2));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = bounds.w * 2; canvas.height = bounds.h * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#F5F8F6"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = "entiquity-org-chart.png"; a.click();
  }

  return (
    <div>
      {/* Chart switcher */}
      <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-white p-1">
        <button onClick={() => router.push("/org-chart")}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition",
            !activeChart ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-ink")}>
          All entities
        </button>
        {charts.map((c) => (
          <button key={c.id} onClick={() => router.push(`/org-chart?chart=${c.id}`)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition",
              activeChart === c.id ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-ink")}>
            {c.name}
          </button>
        ))}
        <button
          onClick={async () => {
            const name = prompt("Name the new chart (e.g. \"Fund II\", \"Sunset Plaza JV\"):");
            if (!name?.trim()) return;
            const r: any = await createChart(name);
            if (r?.error) setErr(r.error);
            else router.push(`/org-chart?chart=${r.id}`);
          }}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-soft">
          + New chart
        </button>
        {current && (
          <span className="ml-auto flex items-center gap-1">
            <button className="btn-ghost text-xs" onClick={async () => {
              const name = prompt("Rename chart:", current.name);
              if (!name?.trim() || name === current.name) return;
              const r: any = await renameChart(current.id, name);
              if (r?.error) setErr(r.error); else router.refresh();
            }}>Rename</button>
            <button className="btn-ghost text-xs text-danger" onClick={async () => {
              if (!confirm(`Delete the chart "${current.name}"? The entities on it are NOT deleted — they stay in your workspace and on other charts.`)) return;
              const r: any = await deleteChart(current.id);
              if (r?.error) setErr(r.error); else router.push("/org-chart");
            }}>Delete chart</button>
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => { setPanel("add-entity"); setSelected(null); }}>Add entity</button>
        <button className="btn-secondary" onClick={() => { setPanel("add-link"); setSelected(null); }}>Add owner / link</button>
        {current && <AddExistingPicker current={current} entities={entities} allEntities={allEntities} onError={setErr} />}
        <button className="btn-secondary" onClick={() => { setPanel("import"); setSelected(null); }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 16h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Import from file (AI)
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost" onClick={() => zoom(1.25)} aria-label="Zoom out">−</button>
          <button className="btn-ghost" onClick={() => zoom(0.8)} aria-label="Zoom in">+</button>
          <button className="btn-ghost" onClick={() => setView(null)}>Fit</button>
          <button className="btn-ghost" onClick={downloadPng}>PNG</button>
        </div>
      </div>
      {msg && <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{msg}</p>}
      {err && !panel && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{err}</p>}

      <div className="flex gap-4">
        {/* Chart */}
        <div className="card min-w-0 flex-1 overflow-hidden">
          {nodeList.length ? (
            <svg ref={svgRef} className="h-[560px] w-full cursor-grab touch-none active:cursor-grabbing" role="img"
              aria-label="Organization ownership chart"
              viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
              {/* edges */}
              {edges.map((e) => {
                const a = nodes.get(e.from)!, b = nodes.get(e.to)!;
                const x1 = a.x, y1 = a.y + NODE_H, x2 = b.x, y2 = b.y;
                const my = (y1 + y2) / 2;
                const hot = selected && (e.from === selected || e.to === selected);
                return (
                  <g key={e.id}>
                    <path d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                      fill="none" stroke={hot ? "#08312A" : "#B9C9C0"} strokeWidth={hot ? 2 : 1.4}
                      strokeDasharray={e.row ? undefined : "5 4"} />
                    {e.pct != null && (
                      <g transform={`translate(${(x1 + x2) / 2}, ${my})`}>
                        <rect x={-21} y={-10} width={42} height={18} rx={9} fill={hot ? "#08312A" : "#E4F7EC"} />
                        <text textAnchor="middle" dy={3.5} fontSize={10} fontWeight={600} fill={hot ? "#00E47C" : "#08312A"}>{e.pct}%</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {/* nodes */}
              {nodeList.map((n) => {
                const isSel = n.id === selected;
                return (
                  <g key={n.id} transform={`translate(${n.x - NODE_W / 2}, ${n.y})`} className="cursor-pointer"
                    onClick={() => { setSelected(n.id); setPanel("details"); setErr(null); setMsg(null); }}>
                    <rect width={NODE_W} height={NODE_H} rx={n.kind === "person" ? 30 : 10}
                      fill={isSel ? "#08312A" : "#FFFFFF"}
                      stroke={isSel ? "#08312A" : n.kind === "person" ? "#8BEFBE" : "#E3E9E5"}
                      strokeWidth={isSel ? 2 : 1.4}
                      strokeDasharray={n.ownerType === "trust" ? "5 3" : undefined} />
                    {n.kind === "entity" && <rect width={NODE_W} height={4} rx={2} fill={isSel ? "#00E47C" : "#08312A"} />}
                    <text x={NODE_W / 2} y={26} textAnchor="middle" fontSize={12} fontWeight={600}
                      fill={isSel ? "#FFFFFF" : "#0D1B16"}>
                      {n.label.length > 28 ? n.label.slice(0, 27) + "…" : n.label}
                    </text>
                    <text x={NODE_W / 2} y={44} textAnchor="middle" fontSize={10}
                      fill={isSel ? "#8BEFBE" : "#71837B"}>
                      {n.sub.length > 34 ? n.sub.slice(0, 33) + "…" : n.sub}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm font-semibold">No entities on the chart yet</p>
              <p className="max-w-sm text-sm text-ink-soft">Add your first entity, or drop in an existing org chart and let AI build it for you.</p>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => setPanel("add-entity")}>Add entity</button>
                <button className="btn-secondary" onClick={() => setPanel("import")}>Import from file (AI)</button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {panel && (
          <aside className="card w-[340px] shrink-0 self-start p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {panel === "details" ? (sel?.label ?? "Details")
                  : panel === "add-entity" ? "Add entity"
                  : panel === "add-link" ? "Add owner / link"
                  : "Import a chart with AI"}
              </h2>
              <button className="btn-ghost" onClick={() => { setPanel(null); setSelected(null); setErr(null); }} aria-label="Close panel">✕</button>
            </div>
            {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{err}</p>}

            {panel === "details" && sel && (
              <NodeDetails node={sel} owners={selOwners} holdings={selHoldings} nodes={nodes} busy={busy}
                chartName={current?.name ?? null}
                onRemoveFromChart={current && sel.kind === "entity" ? () => {
                  act(() => removeEntityFromChart(current.id, sel.id), "Removed from this chart.").then(() => { setSelected(null); setPanel(null); });
                } : undefined}
                onDeleteLink={(id) => { if (confirm("Remove this ownership link?")) act(() => deleteOwnershipLink(id), "Link removed."); }}
                onDeleteNode={() => {
                  if (sel.kind === "entity") {
                    if (confirm(`Delete ${sel.label}? This permanently removes the entity and everything attached to it (documents, tasks, ownership records).`))
                      act(() => deleteEntityNode(sel.id), "Entity deleted.").then(() => { setSelected(null); setPanel(null); });
                  } else {
                    if (confirm(`Remove ${sel.label} from the chart? All of their ownership records will be deleted.`))
                      act(() => deletePersonOwner(sel.label, sel.ownerType ?? "individual"), "Owner removed.").then(() => { setSelected(null); setPanel(null); });
                  }
                }}
                onAddLinkHere={() => setPanel("add-link")} />
            )}

            {panel === "add-entity" && (
              <AddEntityForm busy={busy} onSubmit={(v) => act(() => addEntityNode({ ...v, chart_id: activeChart }), "Entity added to the chart.").then((r: any) => { if (!r?.error) setPanel(null); })} />
            )}

            {panel === "add-link" && (
              <AddLinkForm entities={entities} busy={busy} defaultOwned={sel?.kind === "entity" ? sel.id : undefined}
                onSubmit={(v) => act(() => addOwnershipLink(v), "Ownership link added.").then((r: any) => { if (!r?.error) setPanel(null); })} />
            )}

            {panel === "import" && (
              <ImportPanel chartId={activeChart} onDone={(m) => { setMsg(m); setPanel(null); router.refresh(); }} />
            )}
          </aside>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">Drag to pan · use − / + to zoom · click any box for details. Solid lines are ownership records; dashed lines show parent structure without a recorded ownership stake.</p>
    </div>
  );
}

/* ---------- details panel ---------- */
function NodeDetails({ node, owners, holdings, nodes, busy, onDeleteLink, onDeleteNode, onAddLinkHere, onRemoveFromChart, chartName }: {
  node: Node; owners: Edge[]; holdings: Edge[]; nodes: Map<string, Node>; busy: boolean;
  onDeleteLink: (id: string) => void; onDeleteNode: () => void; onAddLinkHere: () => void;
  onRemoveFromChart?: () => void; chartName?: string | null;
}) {
  const e = node.entity;
  return (
    <div className="space-y-4 text-sm">
      {e ? (
        <dl className="space-y-1.5">
          {[
            ["Type", ENTITY_TYPES[e.entity_type] ?? e.entity_type],
            ["Status", ENTITY_STATUSES[e.status] ?? e.status],
            ["Jurisdiction", e.jurisdiction ?? "—"],
            ["Formed", fmtDate(e.formation_date)],
            ["EIN", e.ein ?? "—"],
            ["Registered agent", e.registered_agent ?? "—"],
            ["Client / matter", e.client_matter ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-3">
              <dt className="text-ink-faint">{k}</dt><dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-ink-soft">{node.sub} owner{holdings.length ? ` with ${holdings.length} holding${holdings.length === 1 ? "" : "s"}` : ""}.</p>
      )}

      {owners.length > 0 && (
        <div>
          <div className="label">Owned by</div>
          <ul className="space-y-1">
            {owners.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-2.5 py-1.5">
                <span className="truncate">{nodes.get(o.from)?.label ?? o.row.owner_name}
                  {o.pct != null && <span className="ml-1 text-xs font-semibold text-accent">{o.pct}%</span>}
                  {o.row.share_class && <span className="ml-1 text-xs text-ink-faint">({o.row.share_class})</span>}
                </span>
                <button className="shrink-0 text-xs text-ink-faint hover:text-danger" disabled={busy}
                  onClick={() => onDeleteLink(o.id)} aria-label="Remove link">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {holdings.length > 0 && (
        <div>
          <div className="label">Holdings</div>
          <ul className="space-y-1">
            {holdings.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-2.5 py-1.5">
                <span className="truncate">{nodes.get(h.to)?.label}
                  {h.pct != null && <span className="ml-1 text-xs font-semibold text-accent">{h.pct}%</span>}
                </span>
                <button className="shrink-0 text-xs text-ink-faint hover:text-danger" disabled={busy}
                  onClick={() => onDeleteLink(h.id)} aria-label="Remove link">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        {e && <Link href={`/entities/${e.id}`} className="btn-secondary w-full">Open full entity profile</Link>}
        <button className="btn-secondary w-full" onClick={onAddLinkHere}>Add owner / link</button>
        {onRemoveFromChart && (
          <button className="btn-secondary w-full" disabled={busy} onClick={onRemoveFromChart}>
            Remove from “{chartName}” only
          </button>
        )}
        <button className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-danger transition hover:bg-red-50" disabled={busy} onClick={onDeleteNode}>
          {node.kind === "entity" ? "Delete entity" : "Remove owner from chart"}
        </button>
      </div>
    </div>
  );
}

/* ---------- add entity ---------- */
function AddEntityForm({ busy, onSubmit }: { busy: boolean; onSubmit: (v: any) => void }) {
  const [v, setV] = useState({ legal_name: "", entity_type: "llc", jurisdiction: "", status: "active" });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
      <div><label className="label" htmlFor="oc-name">Legal name</label>
        <input id="oc-name" className="input" required value={v.legal_name} onChange={(e) => setV({ ...v, legal_name: e.target.value })} placeholder="Acme Holdings LLC" /></div>
      <div><label className="label" htmlFor="oc-type">Type</label>
        <select id="oc-type" className="input" value={v.entity_type} onChange={(e) => setV({ ...v, entity_type: e.target.value })}>
          {Object.entries(ENTITY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
      <div><label className="label" htmlFor="oc-jur">Jurisdiction</label>
        <input id="oc-jur" className="input" value={v.jurisdiction} onChange={(e) => setV({ ...v, jurisdiction: e.target.value })} placeholder="Delaware" /></div>
      <div><label className="label" htmlFor="oc-status">Status</label>
        <select id="oc-status" className="input" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
          {Object.entries(ENTITY_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Adding…" : "Add entity"}</button>
    </form>
  );
}

/* ---------- add link ---------- */
function AddLinkForm({ entities, busy, defaultOwned, onSubmit }: {
  entities: EntityRow[]; busy: boolean; defaultOwned?: string; onSubmit: (v: any) => void;
}) {
  const [ownerMode, setOwnerMode] = useState<"entity" | "person">("entity");
  const [v, setV] = useState({
    owner_entity_id: "", owner_name: "", owner_type: "individual",
    owned_entity_id: defaultOwned ?? "", percentage: "", share_class: "", effective_date: "",
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ownerEntity = ownerMode === "entity" ? entities.find((x) => x.id === v.owner_entity_id) : null;
    onSubmit({
      owned_entity_id: v.owned_entity_id,
      owner_entity_id: ownerMode === "entity" ? v.owner_entity_id || null : null,
      owner_name: ownerMode === "entity" ? (ownerEntity?.legal_name ?? "") : v.owner_name,
      owner_type: ownerMode === "entity" ? "entity" : v.owner_type,
      percentage: v.percentage === "" ? null : Number(v.percentage),
      share_class: v.share_class || null,
      effective_date: v.effective_date || null,
    });
  }
  return (
    <form className="space-y-3" onSubmit={submit}>
      <div>
        <div className="label">Owner is…</div>
        <div className="flex gap-2">
          {(["entity", "person"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setOwnerMode(m)}
              className={cn("flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                ownerMode === m ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft")}>
              {m === "entity" ? "An entity" : "A person / trust"}
            </button>
          ))}
        </div>
      </div>
      {ownerMode === "entity" ? (
        <div><label className="label" htmlFor="ol-owner-e">Owner entity</label>
          <select id="ol-owner-e" className="input" required value={v.owner_entity_id} onChange={(e) => setV({ ...v, owner_entity_id: e.target.value })}>
            <option value="">Choose entity…</option>
            {entities.map((x) => <option key={x.id} value={x.id}>{x.legal_name}</option>)}
          </select></div>
      ) : (
        <>
          <div><label className="label" htmlFor="ol-owner-n">Owner name</label>
            <input id="ol-owner-n" className="input" required value={v.owner_name} onChange={(e) => setV({ ...v, owner_name: e.target.value })} placeholder="Jane Smith" /></div>
          <div><label className="label" htmlFor="ol-owner-t">Owner type</label>
            <select id="ol-owner-t" className="input" value={v.owner_type} onChange={(e) => setV({ ...v, owner_type: e.target.value })}>
              <option value="individual">Individual</option><option value="trust">Trust</option><option value="other">Other</option>
            </select></div>
        </>
      )}
      <div><label className="label" htmlFor="ol-owned">Owns</label>
        <select id="ol-owned" className="input" required value={v.owned_entity_id} onChange={(e) => setV({ ...v, owned_entity_id: e.target.value })}>
          <option value="">Choose entity…</option>
          {entities.map((x) => <option key={x.id} value={x.id}>{x.legal_name}</option>)}
        </select></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="ol-pct">Percent</label>
          <input id="ol-pct" className="input" type="number" min="0" max="100" step="0.0001" value={v.percentage} onChange={(e) => setV({ ...v, percentage: e.target.value })} placeholder="100" /></div>
        <div><label className="label" htmlFor="ol-class">Share class</label>
          <input id="ol-class" className="input" value={v.share_class} onChange={(e) => setV({ ...v, share_class: e.target.value })} placeholder="Common" /></div>
      </div>
      <div><label className="label" htmlFor="ol-date">Effective date</label>
        <input id="ol-date" className="input" type="date" value={v.effective_date} onChange={(e) => setV({ ...v, effective_date: e.target.value })} /></div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Adding…" : "Add link"}</button>
    </form>
  );
}

/* ---------- AI import ---------- */
function ImportPanel({ chartId, onDone }: { chartId: string | null; onDone: (msg: string) => void }) {
  const [stage, setStage] = useState<"pick" | "extracting" | "review" | "saving">("pick");
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<DraftNode[]>([]);
  const [links, setLinks] = useState<DraftLink[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null); setStage("extracting");
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/org-chart/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Extraction failed."); setStage("pick"); return; }
      setNodes(data.nodes); setLinks(data.links); setStage("review");
    } catch { setError("Extraction failed. Check your connection and try again."); setStage("pick"); }
  }

  async function save() {
    setStage("saving"); setError(null);
    const r = await commitExtractedChart({ nodes, links, chart_id: chartId });
    if ((r as any).error) { setError((r as any).error); setStage("review"); return; }
    const { created, added, skipped } = r as any;
    onDone(`Chart imported: ${created} entit${created === 1 ? "y" : "ies"} created, ${added} link${added === 1 ? "" : "s"} added${skipped ? `, ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}.`);
  }

  if (stage === "pick" || stage === "extracting") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-ink-soft">Drop in an existing org chart — PDF, image (PNG/JPG/WebP/GIF), or PowerPoint — and AI will read it and build the structure for you. You review everything before it's saved.</p>
        <button type="button"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          disabled={stage === "extracting"}
          className={cn("flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-sm transition",
            dragOver ? "border-accent bg-accent-soft" : "border-line hover:border-ink-faint")}>
          {stage === "extracting" ? (
            <><span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-ink-soft">Reading the chart…</span></>
          ) : (
            <><svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="text-accent" aria-hidden><path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 16h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="font-medium">Drop a file or click to browse</span>
              <span className="text-xs text-ink-faint">PDF · PNG · JPG · WebP · GIF · PPTX · up to 15 MB</span></>
          )}
        </button>
        <input ref={inputRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.pptx"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-ink-soft">Review the draft — edit names, fix types, remove anything wrong. Nothing is saved until you confirm.</p>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="label mb-0">Names ({nodes.length})</div>
          <button className="text-xs font-medium text-accent hover:underline"
            onClick={() => setNodes([...nodes, { name: "", kind: "entity", entity_type: "llc", jurisdiction: null, existing_id: null }])}>+ Add</button>
        </div>
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {nodes.map((n, i) => (
            <div key={i} className="rounded-lg border border-line p-2">
              <div className="flex items-center gap-1.5">
                <input className="input py-1 text-xs" value={n.name} placeholder="Name" aria-label="Name"
                  onChange={(e) => setNodes(nodes.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <button className="shrink-0 text-xs text-ink-faint hover:text-danger" aria-label="Remove"
                  onClick={() => { const nm = nodes[i].name; setNodes(nodes.filter((_, j) => j !== i)); setLinks(links.filter((l) => l.owner !== nm && l.owned !== nm)); }}>✕</button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <select className="input py-1 text-xs" value={n.kind} aria-label="Kind"
                  onChange={(e) => setNodes(nodes.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}>
                  <option value="entity">Entity</option><option value="individual">Individual</option><option value="trust">Trust</option><option value="other">Other</option>
                </select>
                {n.kind === "entity" && (
                  <select className="input py-1 text-xs" value={n.entity_type ?? "llc"} aria-label="Entity type"
                    onChange={(e) => setNodes(nodes.map((x, j) => j === i ? { ...x, entity_type: e.target.value } : x))}>
                    {Object.entries(ENTITY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                )}
                {n.existing_id && <span className="badge shrink-0 bg-accent-soft text-accent">Matches existing</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="label mb-0">Ownership links ({links.length})</div>
          <button className="text-xs font-medium text-accent hover:underline"
            onClick={() => setLinks([...links, { owner: nodes[0]?.name ?? "", owned: nodes[1]?.name ?? "", percentage: null, share_class: null }])}>+ Add</button>
        </div>
        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-line p-2">
              <select className="input min-w-0 flex-1 py-1 text-xs" value={l.owner} aria-label="Owner"
                onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, owner: e.target.value } : x))}>
                {nodes.map((n) => <option key={n.name} value={n.name}>{n.name || "(unnamed)"}</option>)}
              </select>
              <span className="shrink-0 text-ink-faint">→</span>
              <select className="input min-w-0 flex-1 py-1 text-xs" value={l.owned} aria-label="Owned"
                onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, owned: e.target.value } : x))}>
                {nodes.filter((n) => n.kind === "entity").map((n) => <option key={n.name} value={n.name}>{n.name || "(unnamed)"}</option>)}
              </select>
              <input className="input w-14 shrink-0 py-1 text-xs" type="number" min="0" max="100" placeholder="%" aria-label="Percentage"
                value={l.percentage ?? ""} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, percentage: e.target.value === "" ? null : Number(e.target.value) } : x))} />
              <button className="shrink-0 text-xs text-ink-faint hover:text-danger" aria-label="Remove link"
                onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{error}</p>}
      <div className="flex gap-2 border-t border-line pt-3">
        <button className="btn-secondary flex-1" onClick={() => { setStage("pick"); setNodes([]); setLinks([]); }}>Start over</button>
        <button className="btn-primary flex-1" disabled={stage === "saving" || !nodes.some((n) => n.name.trim())} onClick={save}>
          {stage === "saving" ? "Saving…" : "Save to workspace"}
        </button>
      </div>
    </div>
  );
}


/* ---------- add an existing entity to the active chart ---------- */
function AddExistingPicker({ current, entities, allEntities, onError }: {
  current: { id: string; name: string }; entities: EntityRow[]; allEntities: EntityRow[]; onError: (e: string | null) => void;
}) {
  const router = useRouter();
  const onChart = new Set(entities.map((e) => e.id));
  const candidates = allEntities.filter((e) => !onChart.has(e.id));
  if (!candidates.length) return null;
  return (
    <select
      className="input w-auto"
      value=""
      aria-label={`Add an existing entity to ${current.name}`}
      onChange={async (e) => {
        const id = e.target.value;
        if (!id) return;
        const r: any = await addEntityToChart(current.id, id);
        if (r?.error) onError(r.error); else router.refresh();
      }}>
      <option value="">Add existing entity to this chart…</option>
      {candidates.map((c) => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
    </select>
  );
}
