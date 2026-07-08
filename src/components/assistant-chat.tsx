"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which entities have annual reports due in the next 60 days?",
  "Summarize the ownership structure of Acme Holdings LLC.",
  "Which entities are missing operating agreements?",
  "Show me all Delaware LLCs formed before 2020.",
  "Generate a board resolution approving a new bank account.",
  "Which records look incomplete or risky?",
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The assistant is unavailable right now.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message);
      setMessages(next);
    }
    setBusy(false);
  }

  return (
    <div className="card flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-ink-soft">Try one of these to start:</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-lg border border-line px-3 py-2.5 text-left text-sm text-ink-soft transition hover:border-accent hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={m.role === "user"
              ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white"
              : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-canvas px-4 py-2.5 text-sm leading-relaxed"}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-ink-faint">entiquity Assistant is reading your records…</div>}
        {error && <div className="text-sm text-danger">{error}</div>}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-line p-3">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className="input" placeholder="Ask about your entities, deadlines, or documents…"
            value={input} onChange={(e) => setInput(e.target.value)} aria-label="Message the assistant" />
          <button className="btn-primary shrink-0" disabled={busy}>Send</button>
        </form>
        <p className="mt-2 text-center text-xs text-ink-faint">
          Answers are based on your organization's records. Not legal advice — drafts require attorney review.
        </p>
      </div>
    </div>
  );
}
