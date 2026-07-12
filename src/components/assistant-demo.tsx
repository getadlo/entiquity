"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EXCHANGES = [
  {
    q: "Which entities have annual reports due in the next 60 days?",
    a: ["3 entities:", "• SCF II Holdings LLC — Aug 14", "• Northloop Realty Partners LLC — Aug 29", "• Kestrel Property Co. Ltd. — Sep 2", "Two are unassigned. Want me to flag them for your paralegal?"],
    src: "Source: live compliance calendar",
  },
  {
    q: "Summarize the ownership structure of Fund II.",
    a: ["Summit Capital Fund II, LP is controlled by Summit GP Partners (GP) with Limited Partners holding 99% of interests.", "The fund owns SCF II Holdings LLC (100%), Northloop Realty LLC (85%), and Kestrel Property Co. (60%)."],
    src: "Sources: ownership records · Fund II LPA",
  },
  {
    q: "Which entities are missing operating agreements?",
    a: ["2 of 14 entities have no governing document on file:", "• Northloop Realty Partners LLC", "• Kestrel Property Co. Ltd."],
    src: "Gap analysis across your document library",
  },
  {
    q: "Generate a board resolution approving a new bank account.",
    a: ["Draft ready for SCF II Holdings LLC — pre-filled with its current managers and today's date.", "Marked as a draft for attorney review before signature."],
    src: "Template: banking resolution · entity records",
  },
];

/** Chat window that types each prompt, "thinks", answers, and loops. */
export default function AssistantDemo() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);          // chars of the question typed
  const [phase, setPhase] = useState<"typing" | "thinking" | "answer" | "hold">("typing");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ex = EXCHANGES[i];

  useEffect(() => {
    const t = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    timers.current.forEach(clearTimeout); timers.current = [];

    if (phase === "typing") {
      if (typed < ex.q.length) t(() => setTyped((v) => v + 1), 26);
      else t(() => setPhase("thinking"), 350);
    } else if (phase === "thinking") {
      t(() => setPhase("answer"), 1100);
    } else if (phase === "answer") {
      t(() => setPhase("hold"), 3800);
    } else {
      t(() => { setI((v) => (v + 1) % EXCHANGES.length); setTyped(0); setPhase("typing"); }, 600);
    }
    return () => { timers.current.forEach(clearTimeout); };
  }, [phase, typed, ex.q.length]);

  return (
    <div className="card overflow-hidden">
      {/* chrome */}
      <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3">
        <span className="text-sm font-semibold">entiquity Assistant</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-faint">
          <span className={cn("h-1.5 w-1.5 rounded-full", phase === "thinking" ? "animate-pulse bg-warn" : "bg-bright")} />
          {phase === "thinking" ? "Reading your records…" : "Grounded in your records only"}
        </span>
      </div>

      <div className="flex h-[330px] flex-col justify-end gap-3 p-4" aria-live="polite">
        {/* question bubble */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white">
            {ex.q.slice(0, typed)}
            {phase === "typing" && <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-bright align-middle" />}
          </div>
        </div>

        {/* thinking dots */}
        {phase === "thinking" && (
          <div className="flex">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-canvas px-4 py-3">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: `${d * 140}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* answer bubble */}
        {(phase === "answer" || phase === "hold") && (
          <div className="flex">
            <div className="max-w-[92%] animate-[fadeup_.45s_ease-out] rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3 text-sm shadow-card">
              {ex.a.map((line, k) => (
                <p key={k} className={cn("leading-relaxed", k > 0 && "mt-1", line.startsWith("•") && "text-ink-soft")}>{line}</p>
              ))}
              <p className="mt-2 border-t border-line pt-1.5 text-xs font-medium text-accent">{ex.src}</p>
            </div>
          </div>
        )}
      </div>

      {/* prompt chips */}
      <div className="flex flex-wrap gap-1.5 border-t border-line bg-canvas/40 px-4 py-3">
        {EXCHANGES.map((e, k) => (
          <button key={k} onClick={() => { setI(k); setTyped(0); setPhase("typing"); }}
            className={cn("badge border transition", i === k ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-ink-faint hover:text-ink-soft")}
            aria-label={`Show example: ${e.q}`}>
            {e.q.length > 34 ? e.q.slice(0, 33) + "…" : e.q}
          </button>
        ))}
      </div>
      <style>{`@keyframes fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
