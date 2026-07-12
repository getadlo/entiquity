"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Looping cinematic of the AI org chart import:
 * 1) a file drops in  2) AI reads it  3) the chart builds node by node
 * 4) a cursor clicks a node and the detail panel opens.
 */
const STEPS = [
  { key: "drop", label: "Drop in any org chart", sub: "PDF, image, or PowerPoint" },
  { key: "scan", label: "AI reads the structure", sub: "Entities, owners, percentages" },
  { key: "build", label: "The chart builds itself", sub: "Reviewed by you, then saved" },
  { key: "click", label: "Click anything", sub: "Full detail on every box" },
] as const;

// node geometry (viewBox 560 x 330)
const N = {
  gp:   { x: 168, y: 16,  w: 150, h: 40, label: "Summit GP Partners", sub: "General partner", pill: true },
  lp:   { x: 340, y: 16,  w: 130, h: 40, label: "Limited Partners", sub: "Investors", pill: true },
  fund: { x: 190, y: 106, w: 180, h: 48, label: "Summit Capital Fund II, LP", sub: "Delaware · LP", dark: true },
  h1:   { x: 42,  y: 226, w: 140, h: 46, label: "SCF II Holdings LLC", sub: "Delaware · LLC" },
  h2:   { x: 210, y: 226, w: 140, h: 46, label: "Northloop Realty LLC", sub: "Illinois · LLC" },
  h3:   { x: 378, y: 226, w: 140, h: 46, label: "Kestrel Property Co.", sub: "UK · Foreign" },
} as const;
type NodeKey = keyof typeof N;
const cx = (k: NodeKey) => N[k].x + N[k].w / 2;
const bottom = (k: NodeKey) => N[k].y + N[k].h;

const BUILD_ORDER: NodeKey[] = ["fund", "gp", "lp", "h1", "h2", "h3"];
const EDGES: { from: NodeKey; to: NodeKey; pct?: string; at: number }[] = [
  { from: "gp", to: "fund", pct: "GP", at: 2 },
  { from: "lp", to: "fund", pct: "99%", at: 3 },
  { from: "fund", to: "h1", pct: "100%", at: 4 },
  { from: "fund", to: "h2", pct: "85%", at: 5 },
  { from: "fund", to: "h3", pct: "60%", at: 6 },
];

export default function OrgChartDemo() {
  const [stage, setStage] = useState(0);          // 0 drop, 1 scan, 2 build, 3 click, 4 hold
  const [built, setBuilt] = useState(0);          // nodes/edges revealed during build
  const [clicked, setClicked] = useState(false);  // node selected + panel open
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    timers.current.forEach(clearTimeout); timers.current = [];

    if (stage === 0) { setBuilt(0); setClicked(false); t(() => setStage(1), 2600); }
    else if (stage === 1) t(() => setStage(2), 2400);
    else if (stage === 2) {
      BUILD_ORDER.forEach((_, k) => t(() => setBuilt(k + 1), 320 * (k + 1)));
      t(() => setStage(3), 320 * (BUILD_ORDER.length + 1) + 500);
    }
    else if (stage === 3) { t(() => setClicked(true), 1000); t(() => setStage(4), 3600); }
    else t(() => setStage(0), 2000);

    return () => { timers.current.forEach(clearTimeout); };
  }, [stage]);

  const showNode = (k: NodeKey) => stage >= 3 || (stage === 2 && built > BUILD_ORDER.indexOf(k));
  const showEdge = (at: number) => stage >= 3 || (stage === 2 && built >= at);
  const activeStep = stage <= 1 ? stage : stage === 2 ? 2 : 3;

  return (
    <div>
      <div className="relative overflow-hidden rounded-card border border-white/10 bg-[#052019] shadow-pop">
        {/* subtle grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        {/* window chrome */}
        <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-3 text-sm font-medium text-white/80">Org chart · <span className="text-bright">Fund II</span></span>
          </div>
          <span className={cn("badge transition-colors duration-500", stage >= 2 ? "bg-bright/15 text-bright" : "bg-white/10 text-white/60")}>
            {stage < 1 ? "Waiting for file" : stage < 2 ? "AI reading…" : stage < 3 ? "Building chart" : "Live · editable"}
          </span>
        </div>

        <div className="relative flex min-h-[360px]">
          {/* main canvas */}
          <div className="relative min-w-0 flex-1">
            {/* Stage 0-1: dropzone + file + scan */}
            <div className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-700", stage <= 1 ? "opacity-100" : "pointer-events-none opacity-0")}>
              <div className={cn("relative flex w-[340px] flex-col items-center rounded-xl border-2 border-dashed px-8 py-10 transition-colors duration-500", stage === 0 ? "border-white/25" : "border-bright/60")}>
                {/* the file */}
                <div className={cn("flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3 backdrop-blur transition-all duration-1000 ease-out", stage === 0 ? "-translate-y-16 opacity-0" : "translate-y-0 opacity-100")}
                  style={stage === 0 ? undefined : { transitionDelay: "100ms" }}>
                  <svg width="26" height="26" viewBox="0 0 20 20" fill="none" className="shrink-0 text-bright"><path d="M5 2.5h7l3 3V17.5H5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M12 2.5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  <div>
                    <div className="text-sm font-medium text-white">Fund II Structure.pdf</div>
                    <div className="text-xs text-white/50">1.2 MB · 6 entities on page 3</div>
                  </div>
                </div>
                {/* scan beam */}
                {stage === 1 && (
                  <div className="pointer-events-none absolute inset-x-4 top-4 bottom-4 overflow-hidden rounded-lg">
                    <div className="absolute inset-x-0 h-10 animate-[scan_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-bright/20 to-transparent" />
                  </div>
                )}
                <p className={cn("mt-5 text-xs transition-colors", stage === 0 ? "text-white/50" : "text-bright")}>
                  {stage === 0 ? "Drop an org chart — PDF · PNG · PPTX" : "Found 6 entities · 5 ownership links · 3 percentages"}
                </p>
              </div>
            </div>

            {/* Stage 2+: the chart */}
            <svg viewBox="0 0 560 330" className={cn("relative h-full w-full transition-opacity duration-700", stage >= 2 ? "opacity-100" : "opacity-0")} role="img" aria-label="AI-built ownership chart of Summit Capital Fund II">
              {EDGES.map((e) => {
                const x1 = cx(e.from), y1 = bottom(e.from), x2 = cx(e.to), y2 = N[e.to].y, my = (y1 + y2) / 2;
                const on = showEdge(e.at);
                return (
                  <g key={`${e.from}-${e.to}`} className="transition-opacity duration-500" opacity={on ? 1 : 0}>
                    <path d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`} fill="none" stroke="rgba(139,239,190,0.45)" strokeWidth="1.5" />
                    {e.pct && (
                      <g transform={`translate(${(x1 + x2) / 2}, ${my})`}>
                        <rect x={-20} y={-9} width={40} height={18} rx={9} fill="#0A3B31" stroke="rgba(139,239,190,0.35)" />
                        <text textAnchor="middle" dy={3.5} fontSize="9.5" fontWeight="600" fill="#00E47C">{e.pct}</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {(Object.keys(N) as NodeKey[]).map((k) => {
                const n = N[k] as any;
                const on = showNode(k);
                const sel = clicked && k === "h1";
                return (
                  <g key={k} style={{ transformOrigin: `${cx(k)}px ${n.y + n.h / 2}px` }}
                    className={cn("transition-all duration-500", on ? "scale-100 opacity-100" : "scale-75 opacity-0")}>
                    <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.pill ? n.h / 2 : 9}
                      fill={sel ? "#00E47C" : n.dark ? "#08312A" : "rgba(255,255,255,0.96)"}
                      stroke={sel ? "#00E47C" : n.pill ? "rgba(139,239,190,0.7)" : n.dark ? "#00E47C" : "rgba(255,255,255,0.25)"}
                      strokeWidth={n.dark || sel ? 1.6 : 1.2} />
                    {n.dark && <rect x={n.x} y={n.y} width={n.w} height={3.5} rx={1.75} fill="#00E47C" />}
                    <text x={cx(k)} y={n.y + (n.sub ? n.h / 2 - 2 : n.h / 2 + 4)} textAnchor="middle" fontSize="10.5" fontWeight="600"
                      fill={sel ? "#052019" : n.dark ? "#FFFFFF" : n.pill ? "#E9FBF1" : "#0D1B16"}
                      style={n.pill ? undefined : undefined}>{n.label}</text>
                    {n.sub && <text x={cx(k)} y={n.y + n.h / 2 + 12} textAnchor="middle" fontSize="8.5"
                      fill={sel ? "#052019" : n.dark ? "#8BEFBE" : n.pill ? "rgba(233,251,241,0.6)" : "#71837B"}>{n.sub}</text>}
                  </g>
                );
              })}
              {/* pills need light fill fix: draw pill labels over dark background */}
            </svg>

            {/* cursor */}
            <div className={cn("pointer-events-none absolute z-10 transition-all ease-in-out", stage === 3 || stage === 4 ? "opacity-100 duration-[900ms]" : "opacity-0 duration-300")}
              style={{ left: stage >= 3 ? "19%" : "70%", top: stage >= 3 ? "76%" : "90%" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 2l12 7-5.5 1L8 16z" fill="#fff" stroke="#052019" strokeWidth="1.2" strokeLinejoin="round"/></svg>
              {clicked && <span className="absolute -inset-2 animate-ping rounded-full border border-bright/70" style={{ animationIterationCount: 1 }} />}
            </div>
          </div>

          {/* detail panel slides in on click */}
          <aside className={cn("relative w-[220px] shrink-0 border-l border-white/10 bg-white/[0.06] backdrop-blur transition-all duration-500", clicked ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0", "hidden sm:block")}
            aria-hidden={!clicked}>
            <div className="p-4 text-left">
              <div className="text-sm font-semibold text-white">SCF II Holdings LLC</div>
              <div className="mt-0.5 text-xs text-bright">Delaware · LLC · Active</div>
              <dl className="mt-3 space-y-1.5 text-xs">
                {[["Owned by", "Fund II · 100%"], ["EIN", "88-1042367"], ["Formed", "Mar 2024"], ["Documents", "4 on file"], ["Next filing", "Annual report · Aug 14"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2"><dt className="text-white/45">{k}</dt><dd className="font-medium text-white/90">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 space-y-1.5">
                <div className="rounded-md bg-bright px-3 py-1.5 text-center text-xs font-semibold text-[#052019]">Open entity profile</div>
                <div className="rounded-md border border-white/20 px-3 py-1.5 text-center text-xs font-medium text-white/85">Add owner / link</div>
              </div>
            </div>
          </aside>
        </div>

        {/* assistant strip */}
        <div className="relative border-t border-white/10 px-4 py-3 text-xs text-white/70">
          <span className="font-medium text-bright">entiquity Assistant:</span>{" "}
          {stage < 2 ? "Drop in a chart and I'll do the rest." : stage < 3 ? "Matching names against your existing entities…" : "Chart saved — every box is now a live record you can edit, document, and export."}
        </div>
      </div>

      {/* step captions */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STEPS.map((s, k) => (
          <button key={s.key} onClick={() => { setClicked(false); setBuilt(0); setStage(k === 3 ? 3 : k); }}
            className="group text-left" aria-label={`Show step: ${s.label}`}>
            <div className={cn("h-0.5 rounded-full transition-colors duration-500", activeStep === k ? "bg-bright" : "bg-white/15 group-hover:bg-white/30")} />
            <div className={cn("mt-2.5 text-sm font-semibold transition-colors", activeStep === k ? "text-white" : "text-white/50")}>{s.label}</div>
            <div className="mt-0.5 text-xs text-white/40">{s.sub}</div>
          </button>
        ))}
      </div>

      <style>{`@keyframes scan { 0% { top: -15%; } 50% { top: 95%; } 100% { top: -15%; } }`}</style>
    </div>
  );
}
