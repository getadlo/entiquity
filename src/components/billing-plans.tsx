"use client";
import { useState } from "react";
import { PLANS } from "@/lib/plans";

export default function BillingPlans({
  currentPlan, isAdmin, hasStripeCustomer,
}: { currentPlan: string | null; isAdmin: boolean; hasStripeCustomer: boolean }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(planId: string) {
    setBusy(planId); setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e: any) { setError(e.message); setBusy(null); }
  }

  async function openPortal() {
    setBusy("portal"); setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e: any) { setError(e.message); setBusy(null); }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-white p-1 text-sm font-medium">
          <button onClick={() => setInterval("month")}
            className={`rounded-md px-3 py-1.5 ${interval === "month" ? "bg-accent-soft text-accent" : "text-ink-soft"}`}>Monthly</button>
          <button onClick={() => setInterval("year")}
            className={`rounded-md px-3 py-1.5 ${interval === "year" ? "bg-accent-soft text-accent" : "text-ink-soft"}`}>Annual · 2 months free</button>
        </div>
        {isAdmin && hasStripeCustomer && (
          <button onClick={openPortal} disabled={busy === "portal"} className="btn-secondary">
            {busy === "portal" ? "Opening…" : "Payment method & invoices"}
          </button>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {!isAdmin && <p className="mb-3 text-sm text-ink-soft">Only owners and admins can change the plan.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.id} className={`card flex flex-col p-5 ${currentPlan === p.id ? "ring-2 ring-accent" : ""}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              {currentPlan === p.id && <span className="text-xs font-medium text-accent">Current plan</span>}
            </div>
            <div className="mt-1.5">
              {p.monthly ? (
                <><span className="text-2xl font-semibold tabular-nums">
                  ${interval === "year" ? Math.round((p.annual ?? 0) / 12).toLocaleString() : p.monthly.toLocaleString()}
                </span><span className="text-sm text-ink-faint">/mo{interval === "year" ? ", billed annually" : ""}</span></>
              ) : <span className="text-xl font-semibold">Custom</span>}
            </div>
            <p className="mt-2 flex-1 text-xs text-ink-soft">{p.users} · {p.entities}</p>
            {p.id === "enterprise" ? (
              <a href="mailto:sales@entiquity.example" className="btn-secondary mt-4">Contact sales</a>
            ) : (
              <button onClick={() => checkout(p.id)} disabled={!isAdmin || busy === p.id || currentPlan === p.id}
                className="btn-primary mt-4">
                {busy === p.id ? "Redirecting…" : currentPlan === p.id ? "Active" : "Choose plan"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
