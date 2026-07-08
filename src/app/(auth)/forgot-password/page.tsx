"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <div className="card p-8">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      {sent ? (
        <p className="mt-4 text-sm text-ink-soft">
          Check <span className="font-medium text-ink">{email}</span> for a reset link. It expires in one hour.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full">Send reset link</button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-ink-soft">
        <Link href="/login" className="font-medium text-accent hover:underline">Back to log in</Link>
      </p>
    </div>
  );
}
