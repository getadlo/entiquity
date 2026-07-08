# entiquity

**Entity management, intelligently organized.**

entiquity is an AI-powered entity management platform for law firms, solo attorneys, corporate legal departments, and registered agent services. It manages legal entities, documents, deadlines, ownership, compliance records, resolutions, and entity history in one secure, multi-tenant workspace.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (Postgres + Row-Level Security + Auth) |
| File storage | Supabase Storage (private bucket, signed URLs) |
| Payments | Stripe (subscriptions, customer portal, webhooks) |
| AI | Anthropic API (Claude) — assistant, entity summaries, drafting |
| Hosting | Vercel (or any Node host) |

## Quick start

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the three files in order:
   - `supabase/migrations/0001_schema.sql` — all tables, enums, triggers
   - `supabase/migrations/0002_rls.sql` — row-level security, roles, storage policies
   - `supabase/migrations/0003_seed.sql` — installs the `seed_demo_data()` function
3. In **Authentication → Providers → Email**, decide whether to require email confirmation (the app supports both).

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in the Supabase URL, anon key, and service-role key (Project Settings → API). Add `ANTHROPIC_API_KEY` to enable AI features (the app degrades gracefully without it) and Stripe keys to enable billing.

### 3. Stripe (optional for local dev)

1. Create five Products in Stripe matching the plans (Solo $199/mo · $1,990/yr, Professional $500/mo · $5,000/yr, Firm $1,200/mo · $12,000/yr, Business $2,000/mo · $20,000/yr).
2. Paste the resulting price IDs into `src/lib/plans.ts`.
3. Point a webhook at `/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.*` events, and set `STRIPE_WEBHOOK_SECRET`.

### 4. Run

```bash
npm install
npm run dev
```

Sign up, and on the workspace-creation screen keep **"Start with demo data"** checked — you'll get a sample firm (Whitfield & Marsh LLP) with 10 entities across 7 jurisdictions, officers, ownership records, compliance deadlines (including overdue ones), documents with extracted text for AI search, resolutions, and an audit trail.

## Architecture notes

**Multi-tenancy & security.** Isolation is enforced in Postgres, not in application code. Every table carries an `organization_id` (directly or via its entity), and RLS policies gate every read and write through membership checks (`is_org_member`, `is_org_editor`, `is_org_admin`). Client-role users pass through a separate `client_can_see_entity` check that only exposes explicitly shared rows. Documents live in a private storage bucket with org-scoped paths and are served exclusively through 60-second signed URLs (`/api/documents/sign`).

**Roles.** Owner, Admin, Attorney, Paralegal, Viewer (staff) and Client (portal only). Role behavior is defined once in the RLS helper functions in `0002_rls.sql` and mirrored in the UI.

**AI.** `src/lib/ai.ts` assembles a grounded context from the caller's org (entities, people, ownership, tasks, extracted document text) — RLS guarantees the model never sees another tenant's data. Three routes: `/api/ai/chat` (assistant), `/api/ai/summary` (entity briefings), `/api/ai/draft` (resolutions/consents/minutes). The system prompt hard-codes the product's AI rules: no legal advice, cite sources, flag uncertainty, always mark drafts for attorney review. `document_chunks` (with pgvector) is provisioned for embedding-based search as an upgrade from the current text search.

**Billing.** `billing_subscriptions` tracks plan/status per org; Stripe Checkout starts subscriptions, the customer portal handles payment methods, upgrades/downgrades, cancellation, and invoices; the webhook syncs state back. Plan limits are surfaced on the billing page.

## Roadmap (Phase 3)

Bulk CSV import, embedding-powered document search, PDF report export, MFA, Resend-powered reminder emails, comment threads on client requests, and integrations.

## Legal

entiquity is a software platform for entity management and workflow automation. entiquity does not provide legal advice. AI-generated outputs should be reviewed by qualified legal counsel before use.
