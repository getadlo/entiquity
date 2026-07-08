-- entiquity — row-level security
-- Hard rule: one organization can never see another organization's data.

-- Helper: current user's role in an org (null if not a member)
create or replace function public.org_role(p_org uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select role from public.memberships
  where organization_id = p_org and user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_org and user_id = auth.uid()
  )
$$;

-- Staff = any non-client member
create or replace function public.is_org_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.org_role(p_org) in
    ('owner','admin','attorney','paralegal','viewer'), false)
$$;

-- Editors can create/update records
create or replace function public.is_org_editor(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.org_role(p_org) in
    ('owner','admin','attorney','paralegal'), false)
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.org_role(p_org) in ('owner','admin'), false)
$$;

-- Client access to a specific entity
create or replace function public.client_can_see_entity(p_entity uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.client_portal_access
    where entity_id = p_entity and client_user_id = auth.uid()
  )
$$;

-- Enable RLS everywhere
alter table public.organizations        enable row level security;
alter table public.users                enable row level security;
alter table public.memberships          enable row level security;
alter table public.invitations          enable row level security;
alter table public.entities             enable row level security;
alter table public.entity_addresses     enable row level security;
alter table public.entity_people        enable row level security;
alter table public.entity_ownership     enable row level security;
alter table public.documents            enable row level security;
alter table public.document_chunks      enable row level security;
alter table public.compliance_tasks     enable row level security;
alter table public.reminders            enable row level security;
alter table public.resolutions          enable row level security;
alter table public.ai_conversations     enable row level security;
alter table public.ai_messages          enable row level security;
alter table public.client_portal_access enable row level security;
alter table public.activity_logs        enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.plans                enable row level security;

-- organizations
create policy org_select on public.organizations for select
  using (is_org_member(id));
create policy org_insert on public.organizations for insert
  with check (auth.uid() is not null);
create policy org_update on public.organizations for update
  using (is_org_admin(id));

-- users: you can see yourself and members of your orgs
create policy users_self on public.users for select using (
  id = auth.uid() or exists (
    select 1 from public.memberships m1
    join public.memberships m2 on m1.organization_id = m2.organization_id
    where m1.user_id = auth.uid() and m2.user_id = public.users.id
  )
);
create policy users_update_self on public.users for update using (id = auth.uid());

-- memberships
create policy memberships_select on public.memberships for select
  using (is_org_member(organization_id));
create policy memberships_insert on public.memberships for insert
  with check (
    -- first member (org creator) or an admin adding people
    is_org_admin(organization_id)
    or (user_id = auth.uid() and not exists (
      select 1 from public.memberships m where m.organization_id = memberships.organization_id))
  );
create policy memberships_update on public.memberships for update
  using (is_org_admin(organization_id));
create policy memberships_delete on public.memberships for delete
  using (is_org_admin(organization_id) or user_id = auth.uid());

-- invitations
create policy invitations_all on public.invitations for all
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));

-- entities: staff see all; clients see only shared entities
create policy entities_select on public.entities for select
  using (is_org_staff(organization_id) or client_can_see_entity(id));
create policy entities_write on public.entities for insert
  with check (is_org_editor(organization_id));
create policy entities_update on public.entities for update
  using (is_org_editor(organization_id));
create policy entities_delete on public.entities for delete
  using (is_org_admin(organization_id));

-- entity sub-tables (staff only; internal detail never reaches clients)
create policy addr_all on public.entity_addresses for all
  using (is_org_staff((select organization_id from public.entities e where e.id = entity_id)))
  with check (is_org_editor((select organization_id from public.entities e where e.id = entity_id)));
create policy people_all on public.entity_people for all
  using (is_org_staff((select organization_id from public.entities e where e.id = entity_id)))
  with check (is_org_editor((select organization_id from public.entities e where e.id = entity_id)));
create policy ownership_all on public.entity_ownership for all
  using (is_org_staff((select organization_id from public.entities e where e.id = entity_id)))
  with check (is_org_editor((select organization_id from public.entities e where e.id = entity_id)));

-- documents: staff see all; clients see only documents shared on their entities
create policy documents_select on public.documents for select using (
  is_org_staff(organization_id)
  or (shared_with_client and entity_id is not null and client_can_see_entity(entity_id))
);
create policy documents_insert on public.documents for insert with check (
  is_org_editor(organization_id)
  or (entity_id is not null and client_can_see_entity(entity_id))  -- client uploads
);
create policy documents_update on public.documents for update
  using (is_org_editor(organization_id));
create policy documents_delete on public.documents for delete
  using (is_org_editor(organization_id));

create policy chunks_select on public.document_chunks for select
  using (is_org_staff(organization_id));
create policy chunks_insert on public.document_chunks for insert
  with check (is_org_editor(organization_id));

-- compliance tasks: staff full; clients see shared reminders on their entities
create policy tasks_select on public.compliance_tasks for select using (
  is_org_staff(organization_id)
  or (shared_with_client and entity_id is not null and client_can_see_entity(entity_id))
);
create policy tasks_write on public.compliance_tasks for insert
  with check (is_org_editor(organization_id));
create policy tasks_update on public.compliance_tasks for update
  using (is_org_editor(organization_id));
create policy tasks_delete on public.compliance_tasks for delete
  using (is_org_editor(organization_id));

create policy reminders_all on public.reminders for all
  using (is_org_staff((select organization_id from public.compliance_tasks t where t.id = task_id)))
  with check (is_org_editor((select organization_id from public.compliance_tasks t where t.id = task_id)));

-- resolutions
create policy resolutions_select on public.resolutions for select
  using (is_org_staff(organization_id));
create policy resolutions_write on public.resolutions for insert
  with check (is_org_editor(organization_id));
create policy resolutions_update on public.resolutions for update
  using (is_org_editor(organization_id));
create policy resolutions_delete on public.resolutions for delete
  using (is_org_editor(organization_id));

-- AI conversations are private to their author within the org
create policy ai_conv_all on public.ai_conversations for all
  using (user_id = auth.uid() and is_org_member(organization_id))
  with check (user_id = auth.uid() and is_org_member(organization_id));
create policy ai_msg_all on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()));

-- client portal access
create policy cpa_select on public.client_portal_access for select
  using (is_org_staff(organization_id) or client_user_id = auth.uid());
create policy cpa_write on public.client_portal_access for insert
  with check (is_org_editor(organization_id));
create policy cpa_delete on public.client_portal_access for delete
  using (is_org_editor(organization_id));

-- audit logs: staff read; any member writes (inserts happen from app actions)
create policy logs_select on public.activity_logs for select
  using (is_org_staff(organization_id));
create policy logs_insert on public.activity_logs for insert
  with check (is_org_member(organization_id));

-- billing: readable by staff, changed by owner/admin (webhooks use service role)
create policy billing_select on public.billing_subscriptions for select
  using (is_org_staff(organization_id));
create policy billing_write on public.billing_subscriptions for insert
  with check (is_org_admin(organization_id));
create policy billing_update on public.billing_subscriptions for update
  using (is_org_admin(organization_id));

-- plans are public reference data
create policy plans_select on public.plans for select using (true);

-- ---------------------------------------------------------------------------
-- Storage: private "documents" bucket, org-scoped paths ({org_id}/{file})
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('documents','documents', false)
on conflict (id) do nothing;

create policy "org members read own org files" on storage.objects for select
  using (bucket_id = 'documents' and is_org_member(((storage.foldername(name))[1])::uuid));
create policy "org editors write own org files" on storage.objects for insert
  with check (bucket_id = 'documents' and is_org_member(((storage.foldername(name))[1])::uuid));
create policy "org editors delete own org files" on storage.objects for delete
  using (bucket_id = 'documents' and is_org_editor(((storage.foldername(name))[1])::uuid));
