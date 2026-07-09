"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l7-8 7 8M5 10v7h4v-4h2v4h4v-7" },
  { href: "/entities", label: "Entities", icon: "M4 6h12M4 10h12M4 14h8" },
  { href: "/documents", label: "Documents", icon: "M6 3h5l4 4v10H6zM11 3v4h4" },
  { href: "/calendar", label: "Calendar", icon: "M4 6h12v10H4zM4 9h12M7 4v3M13 4v3" },
  { href: "/resolutions", label: "Resolutions", icon: "M6 4h8v12l-4-2-4 2zM8 8h4" },
  { href: "/assistant", label: "AI Assistant", icon: "M10 3l1.6 3.9L16 8.5l-3.5 2.6.9 4.4L10 13.2l-3.4 2.3.9-4.4L4 8.5l4.4-1.6z" },
  { href: "/clients", label: "Clients", icon: "M7 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM13 10a2 2 0 100-4M3 16c0-2.2 1.8-4 4-4s4 1.8 4 4M12 12.5c1.8.3 3 1.8 3 3.5" },
  { href: "/reports", label: "Reports", icon: "M4 16V9M9 16V4M14 16v-6" },
  { href: "/settings", label: "Settings", icon: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.4 1.4M13.6 13.6L15 15M15 5l-1.4 1.4M6.4 13.6L5 15" },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={cn("font-display text-xl font-medium lowercase tracking-tight", light ? "text-bright" : "text-accent")}>
      entiquity
    </span>
  );
}

export default function AppShell({
  orgName, userEmail, role, children,
}: { orgName: string; userEmail: string; role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-white/10 text-bright" : "text-white/70 hover:bg-white/5 hover:text-white"
            )}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d={item.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-accent transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center px-6"><Link href="/dashboard"><Logo light /></Link></div>
        {nav}
        <div className="border-t border-white/10 p-4">
          <div className="truncate text-sm font-medium text-white">{orgName}</div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-white/50">{userEmail} · {role}</span>
            <button onClick={signOut} className="text-xs font-medium text-white/60 hover:text-bright">Sign out</button>
          </div>
        </div>
      </aside>
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-ghost lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
          <form className="relative max-w-md flex-1"
            onSubmit={(e) => { e.preventDefault(); router.push(`/entities?q=${encodeURIComponent(q)}`); }}>
            <svg className="pointer-events-none absolute left-3 top-2.5 text-ink-faint" width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M13 13l4 4M8.5 14a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input className="input pl-9" placeholder="Search entities…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entities" />
          </form>
          <Link href="/entities/new" className="btn-primary hidden sm:inline-flex">Add entity</Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
