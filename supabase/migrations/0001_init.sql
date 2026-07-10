-- ============================================================================
-- Briefly — initial schema (single-owner freelancing ERP)
-- Every table is scoped to user_id and protected by RLS in 0002_rls.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Owners are Supabase Auth users. This profile row is created by a trigger
-- on auth.users so the app always has an owner_name + settings row.
create table if not exists user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  owner_name             text not null default 'Sanjib',
  telegram_chat_id       text,
  telegram_bot_token_enc text, -- encrypted (AES-256-GCM) via app ENCRYPTION_KEY
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Clients ---------------------------------------------------------------------
create table if not exists clients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  company          text,
  email            text,
  phone            text,
  website          text,
  social           jsonb not null default '{}'::jsonb,
  notes            text,
  status           text not null default 'active'
                   check (status in ('active','lead','inactive')),
  tags             text[] not null default '{}',
  favorite         boolean not null default false,
  last_contact_date date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Projects --------------------------------------------------------------------
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  client_id    uuid references clients(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'idea'
               check (status in ('idea','active','waiting','completed','archived')),
  priority     text not null default 'medium'
               check (priority in ('low','medium','high','urgent')),
  start_date   date,
  due_date     date,
  progress     integer not null default 0 check (progress between 0 and 100),
  proposal_id  uuid,
  checklist    jsonb not null default '[]'::jsonb,
  milestones   jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Invoices --------------------------------------------------------------------
create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  client_id      uuid references clients(id) on delete set null,
  invoice_number text not null,
  status         text not null default 'draft'
                 check (status in ('draft','sent','paid','overdue','cancelled')),
  issue_date     date not null default current_date,
  due_date       date,
  tax_rate       numeric(5,2) not null default 0,
  discount       numeric(10,2) not null default 0,
  subtotal       numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  payment_notes  text,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text,
  quantity    numeric(10,2) not null default 1,
  rate        numeric(12,2) not null default 0,
  subtotal    numeric(12,2) not null default 0,
  position    integer not null default 0
);

-- Proposals -------------------------------------------------------------------
create table if not exists proposals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  title       text not null,
  scope       text,
  timeline    text,
  pricing     text,
  terms       text,
  status      text not null default 'draft'
              check (status in ('draft','sent','viewed','accepted','rejected','archived')),
  acceptance_status text check (acceptance_status in ('pending','accepted','rejected')),
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists proposal_items (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  description text,
  amount      numeric(12,2) not null default 0,
  position    integer not null default 0
);

-- Reminders -------------------------------------------------------------------
create table if not exists reminders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  note         text,
  due_at       timestamptz not null,
  repeat       text not null default 'none'
               check (repeat in ('none','daily','weekly','monthly')),
  related_type text check (related_type in ('client','project','invoice','proposal')),
  related_id   uuid,
  status       text not null default 'pending'
               check (status in ('pending','done','skipped')),
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists telegram_delivery_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid references reminders(id) on delete set null,
  chat_id    text,
  message    text,
  status     text not null check (status in ('sent','failed')),
  error      text,
  sent_at    timestamptz not null default now()
);

-- Chatbot ---------------------------------------------------------------------
create table if not exists chatbot_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant','system')),
  content    text not null,
  provider_id uuid,
  model      text,
  created_at timestamptz not null default now()
);

-- Model providers (encrypted API key) ----------------------------------------
create table if not exists model_providers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  base_url           text not null,
  api_key_enc        text, -- encrypted (AES-256-GCM)
  model_name         text not null,
  headers            jsonb not null default '{}'::jsonb,
  is_default         boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Notes -----------------------------------------------------------------------
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  title       text,
  body        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Activity log ----------------------------------------------------------------
create table if not exists activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  summary      text,
  created_at   timestamptz not null default now()
);

-- Indexes ---------------------------------------------------------------------
create index if not exists idx_clients_user on clients(user_id);
create index if not exists idx_clients_status on clients(user_id, status);
create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_projects_client on projects(client_id);
create index if not exists idx_invoices_user on invoices(user_id);
create index if not exists idx_invoices_client on invoices(client_id);
create index if not exists idx_invoices_status on invoices(user_id, status);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
create index if not exists idx_proposals_user on proposals(user_id);
create index if not exists idx_proposals_client on proposals(client_id);
create index if not exists idx_reminders_user on reminders(user_id);
create index if not exists idx_reminders_due on reminders(user_id, due_at);
create index if not exists idx_providers_user on model_providers(user_id);
create index if not exists idx_notes_user on notes(user_id);
create index if not exists idx_activity_user on activity_logs(user_id, created_at);
