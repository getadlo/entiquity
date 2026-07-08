"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shell";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [seed, setSeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (seed) {
      // Demo workspace: schema function creates org + membership + sample data
      const { error } = await supabase.rpc("seed_demo_data", { p_user: user.id });
      if (error) { setBusy(false); return setError(error.message); }
    } else {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name, billing_email: billingEmail || user.email })
        .select("id").single();
      if (orgErr) { setBusy(false); return setError(orgErr.message); }
      const { error: memErr } = await supabase
        .from("memberships")
        .insert({ organization_id: org.id, user_id: user.id, role: "owner" });
      if (memErr) { setBusy(false); return setError(memErr.message); }
      await supabase.from("billing_subscriptions").insert({ organization_id: org.id });
      await supabase.from("activity_logs").insert({
        organization_id: org.id, actor_id: user.id, action: "org.created", detail: `${name} workspace created`,
      });
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-canvas px-4 pt-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-8">
          <h1 className="text-lg font-semibold">Set up your workspace</h1>
          <p className="mt-1 text-sm text-ink-soft">This is where your firm's entities will live.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="org">Firm or company name</label>
              <input id="org" required={!seed} disabled={seed} className="input" placeholder="Whitfield & Marsh LLP"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="billing">Billing email (optional)</label>
              <input id="billing" type="email" disabled={seed} className="input" value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)} />
            </div>
            <label className="flex items-start gap-2.5 rounded-lg border border-line p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={seed} onChange={(e) => setSeed(e.target.checked)} />
              <span>
                <span className="font-medium">Start with demo data</span>
                <span className="block text-xs text-ink-soft">Creates a sample firm with 10 entities, deadlines, ownership records, and documents so you can explore.</span>
              </span>
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
