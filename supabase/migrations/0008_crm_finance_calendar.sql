-- ============================================================================
-- Batch 1: CRM enhancements, Finance, Calendar, Custom fields
-- ============================================================================

-- Interaction history for clients
create table if not exists interactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  type        text not null check (type in ('call','email','meeting','whatsapp','note','other')),
  subject     text,
  content     text,
  duration    integer, -- minutes
  outcome     text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table interactions enable row level security;
create policy "owner_interactions" on interactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_interactions_user on interactions(user_id);
create index idx_interactions_client on interactions(client_id);

-- Custom fields for clients
create table if not exists custom_fields (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('client','project','invoice')),
  field_name  text not null,
  field_type  text not null default 'text' check (field_type in ('text','number','date','select','checkbox')),
  options     jsonb, -- for select type: array of options
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table custom_fields enable row level security;
create policy "owner_custom_fields" on custom_fields
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Custom field values
create table if not exists custom_field_values (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  field_id    uuid not null references custom_fields(id) on delete cascade,
  entity_id   uuid not null,
  value       text,
  created_at  timestamptz not null default now()
);

alter table custom_field_values enable row level security;
create policy "owner_custom_field_values" on custom_field_values
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Expense tracker
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  project_id  uuid references projects(id) on delete set null,
  description text not null,
  amount      numeric(12,2) not null default 0,
  category    text not null default 'other',
  date        date not null default current_date,
  receipt_url text,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table expenses enable row level security;
create policy "owner_expenses" on expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_expenses_user on expenses(user_id);
create index idx_expenses_date on expenses(user_id, date);

-- Calendar events
create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  project_id  uuid references projects(id) on delete set null,
  title       text not null,
  description text,
  start_time  timestamptz not null,
  end_time    timestamptz,
  all_day     boolean not null default false,
  color       text default '#10b981',
  reminder    boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table calendar_events enable row level security;
create policy "owner_calendar_events" on calendar_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_calendar_user on calendar_events(user_id);
create index idx_calendar_date on calendar_events(user_id, start_time);

-- Time tracking
create table if not exists time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references projects(id) on delete set null,
  task        text,
  description text,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  duration    integer, -- seconds
  billable    boolean not null default true,
  rate        numeric(12,2),
  created_at  timestamptz not null default now()
);

alter table time_entries enable row level security;
create policy "owner_time_entries" on time_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_time_entries_user on time_entries(user_id);

-- Recurring invoice schedules
alter table invoices add column if not exists recurring_interval text check (recurring_interval in ('none','weekly','biweekly','monthly','quarterly','yearly'));
alter table invoices add column if not exists recurring_next_date date;
alter table invoices add column if not exists currency text not null default 'USD';

-- Expense categories
alter table expenses add column if not exists currency text not null default 'USD';

-- Client pipeline enhancement
alter table clients add column if not exists pipeline_stage text not null default 'lead'
  check (pipeline_stage in ('lead','contacted','proposal','negotiation','won','lost'));
alter table clients add column if not exists company_name text;
alter table clients add column if not exists industry text;
alter table clients add column if not exists annual_revenue numeric(12,2);
alter table clients add column if not exists employee_count integer;
