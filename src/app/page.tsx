import Link from "next/link";
import HeroShowcase from "@/components/hero-showcase";
import OrgChartDemo from "@/components/org-chart-demo";
import AssistantDemo from "@/components/assistant-demo";
import { Logo } from "@/components/shell";
import { PLANS } from "@/lib/plans";

const FEATURES = [
  { title: "Entity database", icon: "M10 3c3.3 0 6 .9 6 2s-2.7 2-6 2-6-.9-6-2 2.7-2 6-2zM4 5v10c0 1.1 2.7 2 6 2s6-.9 6-2V5M4 10c0 1.1 2.7 2 6 2s6-.9 6-2", body: "Every entity, jurisdiction, EIN, address, and ownership relationship — searchable in one place, with fund and subsidiary structures built in." },
  { title: "Document management", icon: "M5.5 2.5h6.5l2.5 2.5v12.5h-9zM12 2.5V5h2.5M7.5 9h5M7.5 12h5", body: "Formation documents, operating agreements, filings, and consents organized by entity and category, with previews and secure signed links." },
  { title: "Compliance calendar", icon: "M4 5.5h12v11H4zM4 8.5h12M7 3.5v3M13 3.5v3M7.5 12l1.8 1.8 3.2-3.3", body: "Annual reports, franchise taxes, and RA renewals with owners, priorities, reminder schedules, and an overdue view nothing escapes." },
  { title: "Ownership records", icon: "M10 10V3.5A6.5 6.5 0 1 1 3.5 10zM10 10h6.5A6.5 6.5 0 0 1 10 16.5z", body: "Cap-style ownership tracking with percentages, units, effective dates, and a visual chart of who owns what through which entity." },
  { title: "Client portal", icon: "M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2.5 16c.5-2.5 2.2-4 4.5-4s4 1.5 4.5 4M13.5 8.5a2 2 0 1 0 0-4M14 12c1.8.3 3 1.6 3.5 3.5", body: "Share exactly the entities, documents, and reminders each client should see — and nothing else. Clients can upload requested documents directly." },
  { title: "Audit trail", icon: "M10 6v4l2.5 2M17 10a7 7 0 1 1-2-4.9M17 3.5V6h-2.5", body: "Every creation, edit, upload, and permission change is logged. Legal-grade accountability, by default." },
];


const FAQ = [
  { q: "Is entiquity a law firm?", a: "No. entiquity is software for entity management and workflow automation. It does not provide legal advice, and AI-generated documents are drafts that should be reviewed by qualified legal counsel before use." },
  { q: "How is our data protected?", a: "Every organization's data is isolated at the database level with row-level security. Files are stored in private, encrypted storage and served only through short-lived signed URLs. Every action is written to an audit log." },
  { q: "Can clients see our internal notes?", a: "Never, unless you explicitly share a record. Client portal users see only the entities, documents, and reminders you choose to share." },
  { q: "What does the AI use as context?", a: "Only your organization's records — entity data and the text of documents you upload. Answers cite their sources, and the assistant flags anything it cannot verify." },
  { q: "Can we import our existing entity list?", a: "Yes — bulk import from CSV is on the roadmap for early access customers, and our team assists with migrations on Firm plans and above." },
  { q: "Is there a free trial?", a: "Every plan starts with a 14-day free trial. No credit card required to explore the workspace." },
];

function Check() {
  return (
    <svg className="mt-0.5 shrink-0 text-accent" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-accent">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/"><Logo light /></Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
            <a href="#product" className="transition hover:text-white">Product</a>
            <a href="#ai" className="transition hover:text-white">AI</a>
            <a href="#security" className="transition hover:text-white">Security</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10">Log in</Link>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-bright px-4 py-2 text-sm font-semibold text-accent transition hover:bg-bright-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bright">Start free trial</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr,1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-bright" /> The modern operating system for entity management
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Entity management,<br /><em className="text-bright-deep">intelligently organized.</em>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              The AI-powered workspace where fund sponsors, real estate teams, and legal
              departments manage every entity, org chart, filing, and document — without the spreadsheet sprawl.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start free trial</Link>
              <Link href="/signup?demo=1" className="btn-secondary px-6 py-3 text-base">Request demo</Link>
            </div>
            <p className="mt-4 text-xs text-ink-faint">14-day trial · No credit card required · Cancel anytime</p>
          </div>

          {/* Animated product showcase */}
          <HeroShowcase />
        </div>
      </section>

      {/* Value prop */}
      <section id="product" className="border-t border-line bg-canvas/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">The platform</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Every entity. Every filing. Every document.<br className="hidden sm:block" /> One <span className="text-bright-deep">intelligent</span> workspace.
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Built for private equity fund sponsors, real estate platforms, business operations,
            in-house legal teams, and law firms who manage complex entity structures — and can't afford to miss a deadline.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group card relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-bright opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-bright">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d={f.icon} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI org chart import — cinematic demo */}
      <section className="bg-accent py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-bright">AI org chart import</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              From PDF to a living org chart <span className="text-bright">in under a minute</span>.
            </h2>
            <p className="mt-3 text-white/70">
              Drop in the structure chart you already have. AI reads every box, owner, and
              percentage — then builds a fully editable chart you review before saving. One chart per fund, as many as you need.
            </p>
          </div>
          <div className="mt-10">
            <OrgChartDemo />
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">entiquity Assistant</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                Ask your entity book anything.
              </h2>
              <p className="mt-3 text-ink-soft">
                The assistant reads your entity records and uploaded documents — and only yours —
                to answer questions, surface risks, and draft resolutions with citations back to
                the source. It flags what it can't verify, and every generated document carries a
                review-by-counsel disclaimer.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink-soft">
                <li className="flex gap-2"><Check /> Cross-entity questions and document Q&A with source citations</li>
                <li className="flex gap-2"><Check /> Plain-English entity summaries and missing-record alerts</li>
                <li className="flex gap-2"><Check /> Drafts for resolutions, consents, and meeting minutes</li>
                <li className="flex gap-2"><Check /> Never presented as legal advice — always attorney-reviewed</li>
              </ul>
            </div>
            <AssistantDemo />
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-line bg-[#052019] py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-bright">Secure by design</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Legal-grade trust, <span className="text-bright">engineered in</span>.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Row-level isolation", "Encrypted in transit & at rest", "Short-lived signed URLs", "Actor + timestamp on every action"].map((c) => (
                <span key={c} className="rounded-full border border-bright/30 bg-bright/10 px-3 py-1 text-xs font-medium text-bright">{c}</span>
              ))}
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Organization isolation", icon: "M10 2.5l6.5 3v4c0 4.2-2.8 7-6.5 8-3.7-1-6.5-3.8-6.5-8v-4z M7.5 10l1.8 1.8 3.2-3.3", b: "Row-level security guarantees one firm's data is never visible to another — enforced in the database, not just the app." },
              { t: "Encrypted everywhere", icon: "M5.5 9V6.5a4.5 4.5 0 0 1 9 0V9M4.5 9h11v8h-11zM10 12.5v2", b: "Documents live in private encrypted storage and are served only through short-lived signed URLs." },
              { t: "Role-based access", icon: "M10 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4.5 16.5c.6-2.8 2.7-4.5 5.5-4.5s4.9 1.7 5.5 4.5M14.5 6.5h3M16 5v3", b: "Owner, Admin, Attorney, Paralegal, Viewer, and Client roles scope exactly what each person can see and do." },
              { t: "Complete audit log", icon: "M6 3.5h8v13H6zM8 7h4M8 10h4M8 13h2.5M4 5.5v11", b: "Every entity change, upload, and permission change is recorded with actor and timestamp." },
            ].map((x) => (
              <div key={x.t} className="group rounded-card border border-white/10 bg-white/[0.05] p-5 transition-colors duration-300 hover:border-bright/40 hover:bg-white/[0.08]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bright/10 text-bright">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d={x.icon} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{x.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{x.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Built for the people who run complex structures</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Private equity fund sponsors", "A named org chart per fund — GPs, LPs, holdcos, and portfolio companies with every ownership percentage mapped."],
              ["Real estate teams", "Track every property LLC, JV, and TIC across jurisdictions, with filings and key documents attached to each."],
              ["Business operations", "One source of truth for the whole entity stack — formations, EINs, good standing, and who owns what."],
              ["In-house legal teams", "The full subsidiary tree, ownership records, and every filing deadline across jurisdictions in one view."],
              ["Law firms", "Manage entities for every client with roles, audit trails, AI drafting, and a portal clients love."],
              ["Family offices & holdcos", "Trusts, individuals, and entities on one chart — with clean exports for lenders, auditors, and counsel."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-card border border-line p-6">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-ink-soft">{b}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-canvas/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Simple pricing that scales with your entity book</h2>
          <p className="mt-3 text-ink-soft">Pay monthly, or annually and get 2 months free. Every plan starts with a 14-day free trial.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((p) => (
              <div key={p.id} className={`card flex flex-col p-6 ${p.id === "firm" ? "ring-2 ring-accent" : ""}`}>
                {p.id === "firm" && <span className="mb-2 self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">Most popular</span>}
                <h3 className="font-semibold">{p.name}</h3>
                <div className="mt-2">
                  {p.monthly ? (
                    <><span className="text-3xl font-semibold tabular-nums">${p.monthly.toLocaleString()}</span><span className="text-sm text-ink-faint">/mo</span></>
                  ) : (
                    <span className="text-2xl font-semibold">Custom</span>
                  )}
                </div>
                {p.annual && <p className="mt-0.5 text-xs text-ink-faint">${p.annual.toLocaleString()}/yr — 2 months free</p>}
                <p className="mt-3 text-xs font-medium text-ink-soft">{p.users} · {p.entities}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-soft">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check />{f}</li>)}
                </ul>
                <Link href={p.id === "enterprise" ? "/signup?demo=1" : `/signup?plan=${p.id}`}
                  className={`mt-6 ${p.id === "firm" ? "btn-primary" : "btn-secondary"} w-full`}>
                  {p.id === "enterprise" ? "Contact sales" : "Start free trial"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-canvas/50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-accent">Good to know</p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-card border border-line bg-white shadow-card transition-colors open:border-accent/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-faint transition-all duration-300 group-open:rotate-45 group-open:border-accent group-open:bg-accent group-open:text-bright" aria-hidden>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </span>
                </summary>
                <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent py-20 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Bring order to your entity book <span className="text-bright">this week</span>.</h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-bright px-6 py-3 text-base font-semibold text-accent transition hover:bg-bright-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bright">Start free trial</Link>
            <Link href="/signup?demo=1" className="inline-flex items-center justify-center rounded-lg border border-white/25 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bright">Request demo</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo />
            <nav className="flex items-center gap-6 text-sm text-ink-soft">
              <a href="#" className="hover:text-ink">Privacy policy</a>
              <a href="#" className="hover:text-ink">Terms of service</a>
              <a href="#security" className="hover:text-ink">Security</a>
              <a href="https://www.linkedin.com/company/entiquity" target="_blank" rel="noopener noreferrer"
                aria-label="entiquity on LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition hover:border-accent hover:bg-accent hover:text-bright">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
                </svg>
              </a>
            </nav>
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-ink-faint">
            entiquity is a software platform for entity management and workflow automation.
            entiquity does not provide legal advice. AI-generated outputs should be reviewed by
            qualified legal counsel before use. © {new Date().getFullYear()} entiquity.
          </p>
        </div>
      </footer>
    </div>
  );
}
