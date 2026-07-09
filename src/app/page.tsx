import Link from "next/link";
import HeroShowcase from "@/components/hero-showcase";
import { Logo } from "@/components/shell";
import { PLANS } from "@/lib/plans";

const FEATURES = [
  { title: "Entity database", body: "Every entity, jurisdiction, EIN, address, and ownership relationship — searchable in one place, with fund and subsidiary structures built in." },
  { title: "Document management", body: "Formation documents, operating agreements, filings, and consents organized by entity and category, with previews and secure signed links." },
  { title: "Compliance calendar", body: "Annual reports, franchise taxes, and RA renewals with owners, priorities, reminder schedules, and an overdue view nothing escapes." },
  { title: "Ownership records", body: "Cap-style ownership tracking with percentages, units, effective dates, and a visual chart of who owns what through which entity." },
  { title: "Client portal", body: "Share exactly the entities, documents, and reminders each client should see — and nothing else. Clients can upload requested documents directly." },
  { title: "Audit trail", body: "Every creation, edit, upload, and permission change is logged. Legal-grade accountability, by default." },
];

const AI = [
  { q: "Which entities have annual reports due in the next 60 days?", a: "Answers from your live compliance calendar, entity by entity." },
  { q: "Summarize the ownership structure of Acme Holdings LLC.", a: "Plain-English summaries grounded in your ownership records and operating agreements." },
  { q: "Generate a board resolution approving a new bank account.", a: "Drafts from firm-grade templates, pre-filled with the entity's actual officers." },
  { q: "Which entities are missing operating agreements?", a: "Gap analysis across your entire entity book, with citations to what is on file." },
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
            <Link href="/login" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Log in</Link>
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
              Entity management,<br /><em className="text-accent">intelligently organized.</em>
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
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Every entity. Every filing. Every document.<br className="hidden sm:block" /> One intelligent workspace.
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Built for private equity fund sponsors, real estate platforms, business operations,
            in-house legal teams, and law firms who manage complex entity structures — and can't afford to miss a deadline.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
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
            <div className="space-y-3">
              {AI.map((x) => (
                <div key={x.q} className="card p-4">
                  <p className="text-sm font-medium">"{x.q}"</p>
                  <p className="mt-1.5 text-sm text-ink-soft">{x.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-line bg-accent py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-bright">Secure by design</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Legal-grade trust, <span className="text-bright">engineered in</span>.
          </h2>
          <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Organization isolation", "Row-level security guarantees one firm's data is never visible to another — enforced in the database, not just the app."],
              ["Encrypted everywhere", "Documents live in private encrypted storage and are served only through short-lived signed URLs."],
              ["Role-based access", "Owner, Admin, Attorney, Paralegal, Viewer, and Client roles scope exactly what each person can see and do."],
              ["Complete audit log", "Every entity change, upload, and permission change is recorded with actor and timestamp."],
            ].map(([t, b]) => (
              <div key={t}>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 leading-relaxed text-white/70">{b}</p>
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

          {/* Testimonials placeholder */}
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {[
              ["“Testimonial placeholder — a fund CFO on mapping ten funds' structures in an afternoon.”", "CFO, private equity sponsor"],
              ["“Testimonial placeholder — an ops lead on never missing a franchise tax deadline again.”", "Director of Operations, real estate platform"],
              ["“Testimonial placeholder — a GC on visibility across a 60-entity subsidiary tree.”", "General Counsel, growth-stage company"],
            ].map(([q, who]) => (
              <figure key={who} className="card p-6">
                <blockquote className="text-sm leading-relaxed text-ink-soft">{q}</blockquote>
                <figcaption className="mt-3 text-xs font-medium text-ink-faint">{who}</figcaption>
              </figure>
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
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {f.q}
                  <span className="text-ink-faint transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.a}</p>
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
            <nav className="flex gap-6 text-sm text-ink-soft">
              <a href="#" className="hover:text-ink">Privacy policy</a>
              <a href="#" className="hover:text-ink">Terms of service</a>
              <a href="#security" className="hover:text-ink">Security</a>
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
