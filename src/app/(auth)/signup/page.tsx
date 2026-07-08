"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    // If email confirmation is disabled, a session exists — continue to onboarding.
    if (data.session) { router.push("/onboarding"); router.refresh(); }
    else router.push("/verify");
  }

  return (
    <div className="card p-8">
      <h1 className="text-lg font-semibold">Start your 14-day free trial</h1>
      <p className="mt-1 text-sm text-ink-soft">No credit card required.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">Work email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Log in</Link>
      </p>
    </div>
  );
}
