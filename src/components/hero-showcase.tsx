"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SCENES = [
  { key: "entities", label: "Entity book" },
  { key: "chart", label: "Org charts" },
  { key: "export", label: "One-click exports" },
] as const;

/** Animated product showcase for the hero — rotates through the views
 *  people actually buy: the entity book, per-fund org charts, and exports. */
export default function HeroShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % SCENES.length), 4200);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="card relative overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3">
          <span className="text-sm font-semibold">{i === 0 ? "Entities" : i === 1 ? "Org chart · Fund II" : "Export entities"}</span>
          <span className="badge bg-accent-soft text-accent">{i === 0 ? "248 active" : i === 1 ? "4 charts" : "CSV · Excel · PDF"}</span>
        </div>

        <div className="relative h-[300px]">
          {/* Scene 1 — entity book */}
          <Scene active={i === 0}>
            <div className="divide-y divide-line text-sm">
              {[
                ["Summit Capital Fund II, LP", "Delaware · LP", "Annual report in 21 days", "Active"],
                ["SCF II Holdings LLC", "Delaware · LLC", "Franchise tax in 40 days", "Active"],
                ["Northloop Realty Partners LLC", "Illinois · LLC", "Reinstatement overdue", "Suspended"],
                ["Kestrel Property Co. Ltd.", "UK · Foreign", "Qualification in 6 days", "Pending"],
              ].map(([name, meta, due, status]) => (
                <div key={name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{name}</div>
                    <div className="text-xs text-ink-faint">{meta}</div>
                  </div>
                  <div className="hidden text-xs text-ink-soft sm:block">{due}</div>
                  <span className={`badge shrink-0 ${status === "Active" ? "bg-accent-soft text-accent" : status === "Suspended" ? "bg-red-50 text-danger" : "bg-amber-50 text-warn"}`}>{status}</span>
                </div>
              ))}
            </div>
          </Scene>

          {/* Scene 2 — org chart */}
          <Scene active={i === 1}>
            <svg viewBox="0 0 460 268" className="h-full w-full" role="img" aria-label="Ownership chart of a fund structure">
              {/* edges */}
              {[
                [230, 64, 110, 150], [230, 64, 230, 150], [230, 64, 350, 150],
                [230, 20, 230, 32],
              ].map(([x1, y1, x2, y2], k) => (
                <path key={k} d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`} fill="none" stroke="#B9C9C0" strokeWidth="1.4" />
              ))}
              {/* GP pill */}
              <g>
                <rect x={155} y={-4} width={150} height={36} rx={18} fill="#fff" stroke="#8BEFBE" strokeWidth="1.4" />
                <text x={230} y={13} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#0D1B16">Summit GP Partners</text>
                <text x={230} y={25} textAnchor="middle" fontSize="8.5" fill="#71837B">General partner</text>
              </g>
              {/* fund */}
              <g>
                <rect x={145} y={32} width={170} height={44} rx={9} fill="#08312A" />
                <rect x={145} y={32} width={170} height={3.5} rx={1.75} fill="#00E47C" />
                <text x={230} y={51} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">Summit Capital Fund II, LP</text>
                <text x={230} y={65} textAnchor="middle" fontSize="8.5" fill="#8BEFBE">Delaware · LP</text>
              </g>
              {/* pct badges */}
              {[[168, 112, "100%"], [230, 112, "85%"], [292, 112, "60%"]].map(([x, y, t]) => (
                <g key={t as string} transform={`translate(${x}, ${y})`}>
                  <rect x={-18} y={-9} width={36} height={17} rx={8.5} fill="#E4F7EC" />
                  <text textAnchor="middle" dy={3.5} fontSize="9" fontWeight="600" fill="#08312A">{t}</text>
                </g>
              ))}
              {/* holdings */}
              {[
                [110, "SCF II Holdings LLC", "Delaware · LLC"],
                [230, "Northloop Realty LLC", "Illinois · LLC"],
                [350, "Kestrel Property Co.", "UK · Foreign"],
              ].map(([cx, name, meta]) => (
                <g key={name as string}>
                  <rect x={(cx as number) - 62} y={150} width={124} height={44} rx={9} fill="#fff" stroke="#E3E9E5" strokeWidth="1.4" />
                  <rect x={(cx as number) - 62} y={150} width={124} height={3.5} rx={1.75} fill="#08312A" />
                  <text x={cx as number} y={169} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#0D1B16">{name}</text>
                  <text x={cx as number} y={183} textAnchor="middle" fontSize="8" fill="#71837B">{meta}</text>
                </g>
              ))}
              {/* chart tabs */}
              <g transform="translate(230, 232)">
                {["Fund I", "Fund II", "Sunset JV"].map((t, k) => (
                  <g key={t} transform={`translate(${(k - 1) * 76}, 0)`}>
                    <rect x={-33} y={-11} width={66} height={22} rx={6} fill={k === 1 ? "#E4F7EC" : "#fff"} stroke={k === 1 ? "#08312A" : "#E3E9E5"} />
                    <text textAnchor="middle" dy={3.5} fontSize="9" fontWeight="600" fill={k === 1 ? "#08312A" : "#71837B"}>{t}</text>
                  </g>
                ))}
              </g>
            </svg>
          </Scene>

          {/* Scene 3 — export */}
          <Scene active={i === 2}>
            <div className="p-4 text-sm">
              <div className="flex gap-2">
                {["CSV", "Excel", "PDF"].map((f, k) => (
                  <span key={f} className={cn("rounded-lg border px-3.5 py-1.5 text-xs font-medium",
                    k === 2 ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft")}>{f}</span>
                ))}
              </div>
              <div className="label mt-4">Columns</div>
              <div className="flex flex-wrap gap-1.5">
                {[["Legal name", true], ["Jurisdiction", true], ["Formed", false], ["Ownership %", true], ["Status", true]].map(([c, on]) => (
                  <span key={c as string} className={cn("badge border", on ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-ink-faint")}>{c}</span>
                ))}
              </div>
              <div className="label mt-4">Rows (3 of 4)</div>
              <div className="overflow-hidden rounded-lg border border-line">
                {[["Summit Capital Fund II, LP", true], ["SCF II Holdings LLC", true], ["Northloop Realty Partners LLC", false], ["Kestrel Property Co. Ltd.", true]].map(([n, on]) => (
                  <div key={n as string} className={cn("flex items-center gap-2.5 border-b border-line px-3 py-1.5 text-xs last:border-b-0", on ? "bg-white" : "bg-canvas/60 text-ink-faint")}>
                    <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border", on ? "border-accent bg-accent text-white" : "border-line bg-white")}>{on ? "✓" : ""}</span>
                    <span className="truncate">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Scene>
        </div>

        {/* Assistant strip */}
        <div className="bg-accent px-4 py-3 text-xs text-white/80">
          <span className="font-medium text-bright">entiquity Assistant:</span>{" "}
          {i === 1 ? "Fund II chart built from your uploaded PDF in 40 seconds." : i === 2 ? "Branded PDF ready — exactly the rows and columns you picked." : "3 entities are missing operating agreements — review suggested."}
        </div>
      </div>

      {/* Scene selector */}
      <div className="mt-3 flex items-center justify-center gap-4" role="tablist" aria-label="Product views">
        {SCENES.map((s, k) => (
          <button key={s.key} role="tab" aria-selected={i === k} onClick={() => setI(k)}
            className={cn("flex items-center gap-1.5 text-xs font-medium transition", i === k ? "text-accent" : "text-ink-faint hover:text-ink-soft")}>
            <span className={cn("h-1.5 rounded-full transition-all", i === k ? "w-5 bg-bright" : "w-1.5 bg-line")} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Scene({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div aria-hidden={!active}
      className={cn("absolute inset-0 transition-all duration-700 ease-out",
        active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")}>
      {children}
    </div>
  );
}
