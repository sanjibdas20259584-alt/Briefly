-- ============================================================================
-- Batch 2: Analytics enhancements, Automation, Project enhancements
-- ============================================================================

-- Project enhancements
alter table projects add column if not exists template_id uuid;
alter table projects add column if not exists time_estimate integer; -- hours
alter table projects add column if not exists budget numeric(12,2);

-- Project templates
create table if not exists project_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'idea',
  priority    text not null default 'medium',
  checklist   jsonb not null default '[]'::jsonb,
  milestones  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

alter table project_templates enable row level security;
create policy "owner_project_templates" on project_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- File attachments
create table if not exists file_attachments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('client','project','invoice','proposal')),
  entity_id   uuid not null,
  file_name   text not null,
  file_url    text not null,
  file_size   integer,
  mime_type   text,
  folder      text,
  version     integer not null default 1,
  created_at  timestamptz not null default now()
);

alter table file_attachments enable row level security;
create policy "owner_file_attachments" on file_attachments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_file_attachments_entity on file_attachments(entity_type, entity_id);

-- Workflow automation rules
create table if not exists automation_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  trigger_type text not null check (trigger_type in ('invoice_overdue','project_completed','client_inactive','reminder_due','custom')),
  trigger_config jsonb,
  action_type text not null check (action_type in ('send_telegram','create_reminder','update_status','send_email','webhook')),
  action_config jsonb,
  enabled     boolean not null default true,
  last_run    timestamptz,
  created_at  timestamptz not null default now()
);

alter table automation_rules enable row level security;
create policy "owner_automation_rules" on automation_rules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Email tracking
create table if not exists email_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  to_email    text not null,
  subject     text,
  body        text,
  status      text not null default 'sent' check (status in ('sent','delivered','opened','failed')),
  sent_at     timestamptz not null default now()
);

alter table email_logs enable row level security;
create policy "owner_email_logs" on email_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Client portal tokens
create table if not exists portal_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table portal_tokens enable row level security;
create policy "owner_portal_tokens" on portal_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
