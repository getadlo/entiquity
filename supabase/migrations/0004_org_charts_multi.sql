-- Named org charts: a workspace can have many (e.g., one per PE fund)
create table public.org_charts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.org_chart_entities (
  chart_id uuid not null references public.org_charts(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (chart_id, entity_id)
);

create index org_charts_org_idx on public.org_charts(organization_id);
create index org_chart_entities_entity_idx on public.org_chart_entities(entity_id);

alter table public.org_charts enable row level security;
alter table public.org_chart_entities enable row level security;

create policy org_charts_all on public.org_charts for all
  using (is_org_staff(organization_id))
  with check (is_org_editor(organization_id));

create policy org_chart_entities_all on public.org_chart_entities for all
  using (is_org_staff((select organization_id from public.org_charts c where c.id = chart_id)))
  with check (is_org_editor((select organization_id from public.org_charts c where c.id = chart_id)));
