-- entiquity — core schema
-- Run in the Supabase SQL editor (or `supabase db push`) before starting the app.

create extension if not exists "pgcrypto";
create extension if not exists "vector"; -- for AI document search embeddings

-- ---------------------------------------------------------------------------
-- Organizations & people
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  billing_email text,
  default_reminder_days int[] not null default '{30,14,7,1}',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Mirrors auth.users; kept in public schema for joins + RLS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner','admin','attorney','paralegal','viewer','client');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'viewer',
  token uuid not null default gen_random_uuid(),
  invited_by uuid references public.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Entities
-- ---------------------------------------------------------------------------

create type public.entity_type as enum
  ('llc','corporation','lp','llp','nonprofit','trust','partnership','foreign_entity','other');

create type public.entity_status as enum
  ('active','dissolved','pending','inactive','withdrawn','suspended','unknown');

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  entity_type public.entity_type not null default 'llc',
  jurisdiction text,
  formation_date date,
  status public.entity_status not null default 'active',
  ein text,
  registered_agent text,
  client_matter text,
  internal_notes text,
  tags text[] not null default '{}',
  parent_entity_id uuid references public.entities(id) on delete set null,
  custom_fields jsonb not null default '{}',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.entities (organization_id);
create index on public.entities (parent_entity_id);

create type public.address_kind as enum ('principal_office','mailing','other');

create table public.entity_addresses (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  kind public.address_kind not null default 'principal_office',
  line1 text, line2 text, city text, region text, postal_code text, country text default 'US'
);

create type public.person_role as enum
  ('officer','director','member','shareholder','manager','other');

create table public.entity_people (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  name text not null,
  role public.person_role not null default 'officer',
  title text,             -- e.g. President, Treasurer, Director
  email text,
  phone text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.entity_people (entity_id);

create table public.entity_ownership (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  owner_name text not null,
  owner_type text not null default 'individual',  -- individual | entity | trust | other
  owner_entity_id uuid references public.entities(id) on delete set null,
  percentage numeric(7,4),
  units numeric,
  share_class text,
  effective_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.entity_ownership (entity_id);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create type public.document_category as enum
  ('formation','operating_agreement','bylaws','annual_report','tax','board_resolution',
   'written_consent','ownership','state_filing','registered_agent','other');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  name text not null,
  category public.document_category not null default 'other',
  storage_path text,            -- Supabase Storage path (bucket: documents)
  mime_type text,
  size_bytes bigint,
  extracted_text text,          -- populated on upload for AI search
  uploaded_by uuid references public.users(id),
  shared_with_client boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.documents (organization_id);
create index on public.documents (entity_id);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1024)
);
create index on public.document_chunks (document_id);

-- ---------------------------------------------------------------------------
-- Compliance
-- ---------------------------------------------------------------------------

create type public.task_type as enum
  ('annual_report','franchise_tax','ra_renewal','foreign_qualification',
   'board_meeting','ownership_update','custom');

create type public.task_status as enum
  ('not_started','in_progress','waiting_on_client','filed','completed','overdue');

create table public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  name text not null,
  task_type public.task_type not null default 'custom',
  due_date date not null,
  assigned_to uuid references public.users(id),
  status public.task_status not null default 'not_started',
  priority text not null default 'normal',     -- low | normal | high
  notes text,
  reminder_days int[] not null default '{30,7,1}',
  shared_with_client boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.compliance_tasks (organization_id, due_date);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.compliance_tasks(id) on delete cascade,
  remind_on date not null,
  sent_at timestamptz,
  channel text not null default 'email'
);

-- ---------------------------------------------------------------------------
-- Resolutions & AI
-- ---------------------------------------------------------------------------

create type public.resolution_type as enum
  ('board_resolution','written_consent','member_consent','shareholder_consent',
   'officer_appointment','annual_meeting_minutes','banking_resolution',
   'corporate_authorization','secretary_certificate');

create table public.resolutions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  title text not null,
  resolution_type public.resolution_type not null,
  body_md text not null default '',
  status text not null default 'draft',        -- draft | final
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id),
  title text,
  created_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Client portal, audit, billing
-- ---------------------------------------------------------------------------

create table public.client_portal_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  client_user_id uuid not null references public.users(id) on delete cascade,
  can_upload boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entity_id, client_user_id)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  actor_id uuid references public.users(id),
  action text not null,        -- entity.created, document.uploaded, etc.
  detail text,
  created_at timestamptz not null default now()
);
create index on public.activity_logs (organization_id, created_at desc);

create table public.plans (
  id text primary key,                 -- solo | professional | firm | business | enterprise
  name text not null,
  monthly_price_cents int,
  annual_price_cents int,
  max_users int,                       -- null = custom
  max_entities int                     -- null = unlimited
);

insert into public.plans values
  ('solo','Solo',19900,199000,1,100),
  ('professional','Professional',50000,500000,3,1000),
  ('firm','Firm',120000,1200000,25,null),
  ('business','Business',200000,2000000,50,null),
  ('enterprise','Enterprise',null,null,null,null);

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id) default 'solo',
  stripe_customer_id text,
  stripe_subscription_id text,
  interval text not null default 'month',      -- month | year
  status text not null default 'trialing',     -- trialing | active | past_due | canceled
  trial_ends_at timestamptz default now() + interval '14 days',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Mirror new auth users into public.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger entities_touch before update on public.entities
  for each row execute function public.touch_updated_at();
create trigger resolutions_touch before update on public.resolutions
  for each row execute function public.touch_updated_at();
