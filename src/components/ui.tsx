import Link from "next/link";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("badge", className ?? "bg-gray-100 text-ink-soft")}>{children}</span>;
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, hint, href, tone,
}: { label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "danger" | "warn" }) {
  const body = (
    <div className="card px-5 py-4 transition hover:shadow-pop">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={cn("mt-1.5 text-2xl font-semibold tabular-nums",
        tone === "danger" && "text-danger", tone === "warn" && "text-warn")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({
  title, body, action,
}: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="border-b border-line bg-canvas/60">
          <tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
      entiquity is a software platform for entity management and workflow automation. entiquity
      does not provide legal advice. AI-generated outputs should be reviewed by qualified legal
      counsel before use.
    </p>
  );
}
