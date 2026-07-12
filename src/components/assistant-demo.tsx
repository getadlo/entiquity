"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EXCHANGES = [
  {
    q: "Which entities have annual reports due in the next 60 days?",
    a: ["3 entities: SCF II Holdings LLC (Aug 14), Northloop Realty Partners LLC (Aug 29), and Kestrel Property Co. Ltd. (Sep 2).", "Two are unassigned — want me to flag them for your team?"],
    src: "Source: live compliance calendar",
  },
  {
    q: "Summarize the ownership structure of Fund II.",
    a: ["Summit Capital Fund II, LP is controlled by Summit GP Partners (GP), with Limited Partners holding 99% of interests.", "The fund owns SCF II Holdings LLC (100%), Northloop Realty LLC (85%), and Kestrel Property Co. (60%)."],
    src: "Sources: ownership records · Fund II LPA",
  },
  {
    q: "Which entities are missing operating agreements?",
    a: ["2 of 14 entities have no governing document on file: Northloop Realty Partners LLC and Kestrel Property Co. Ltd."],
    src: "Gap analysis across your document library",
  },
  {
    q: "Generate a board resolution approving a new bank account.",
    a: ["Draft ready for SCF II Holdings LLC — pre-filled with its current managers and today's date.", "Marked as a draft for attorney review before signature."],
    src: "Template: banking resolution · entity records",
  },
];

/** Chat demo: each question types into the input bar, posts, the assistant
 *  thinks, answers with a citation — then the next question starts. No buttons. */
export default function AssistantDemo() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "answer" | "hold">("typing");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ex = EXCHANGES[i];

  useEffect(() => {
    const t = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    timers.current.forEach(clearTimeout); timers.current = [];

    if (phase === "typing") {
      if (typed < ex.q.length) t(() => setTyped((v) => v + 1), 24);
      else t(() => setPhase("thinking"), 420);
    } else if (phase === "thinking") {
      t(() => setPhase("answer"), 1100);
    } else if (phase === "answer") {
      t(() => setPhase("hold"), 4200);
    } else {
      t(() => { setI((v) => (v + 1) % EXCHANGES.length); setTyped(0); setPhase("typing"); }, 500);
    }
    return () => { timers.current.forEach(clearTimeout); };
  }, [phase, typed, ex.q.length]);

  const posted = phase !== "typing"; // question has been "sent"

  return (
    <div className="card flex flex-col overflow-hidden">
      {/* chrome */}
      <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3">
        <span className="text-sm font-semibold">entiquity Assistant</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-faint">
          <span className={cn("h-1.5 w-1.5 rounded-full", phase === "thinking" ? "animate-pulse bg-warn" : "bg-bright")} />
          {phase === "thinking" ? "Reading your records…" : "Grounded in your records only"}
        </span>
      </div>

      {/* conversation */}
      <div className="flex min-h-[240px] flex-col justify-end gap-3 p-4" aria-live="polite">
        {posted && (
          <div className="flex justify-end">
            <div className="max-w-[85%] animate-[fadeup_.3s_ease-out] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white">
              {ex.q}
            </div>
          </div>
        )}

        {phase === "thinking" && (
          <div className="flex">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-canvas px-4 py-3">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: `${d * 140}ms` }} />
              ))}
            </div>
          </div>
        )}

        {(phase === "answer" || phase === "hold") && (
          <div className="flex">
            <div className="max-w-[92%] animate-[fadeup_.45s_ease-out] rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3 text-sm shadow-card">
              {ex.a.map((line, k) => (
                <p key={k} className={cn("leading-relaxed", k > 0 && "mt-1.5")}>{line}</p>
              ))}
              <p className="mt-2 border-t border-line pt-1.5 text-xs font-medium text-accent">{ex.src}</p>
            </div>
          </div>
        )}
      </div>

      {/* input bar — where each question types itself */}
      <div className="border-t border-line bg-canvas/40 p-3">
        <div className={cn("flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 transition-colors", phase === "typing" ? "border-accent" : "border-line")}>
          <span className="min-h-[20px] flex-1 truncate text-sm">
            {phase === "typing" ? (
              <>{ex.q.slice(0, typed)}<span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent align-middle" /></>
            ) : (
              <span className="text-ink-faint">Ask about your entities…</span>
            )}
          </span>
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", phase === "typing" && typed >= ex.q.length - 2 ? "bg-accent text-bright" : "bg-canvas text-ink-faint")} aria-hidden>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M10 16V4m0 0L4.5 9.5M10 4l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </div>
      </div>
      <style>{`@keyframes fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
