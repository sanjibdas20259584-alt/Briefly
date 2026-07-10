-- ============================================================================
-- Row Level Security — owner-only access on every table.
-- Each policy filters by user_id = auth.uid(). Anon/public role gets nothing.
-- Idempotent: safe to re-run (drops existing policies first).
-- ============================================================================

alter table user_profiles        enable row level security;
alter table app_settings         enable row level security;
alter table clients              enable row level security;
alter table projects             enable row level security;
alter table invoices             enable row level security;
alter table invoice_items        enable row level security;
alter table proposals            enable row level security;
alter table proposal_items       enable row level security;
alter table reminders            enable row level security;
alter table telegram_delivery_logs enable row level security;
alter table chatbot_messages     enable row level security;
alter table model_providers      enable row level security;
alter table notes                enable row level security;
alter table activity_logs        enable row level security;

-- invoice_items / proposal_items are guarded through their parent rows.
drop policy if exists owner_inv_items on invoice_items;
create policy "owner_inv_items" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );

drop policy if exists owner_prop_items on proposal_items;
create policy "owner_prop_items" on proposal_items
  for all using (
    exists (select 1 from proposals p where p.id = proposal_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from proposals p where p.id = proposal_id and p.user_id = auth.uid())
  );

-- user_profiles is keyed on `id` (not user_id), so it needs a dedicated policy.
drop policy if exists owner_user_profiles on user_profiles;
create policy "owner_user_profiles" on user_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Standard owner policy factory for every other table with user_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_settings','clients','projects','invoices','proposals',
    'reminders','telegram_delivery_logs','chatbot_messages','model_providers',
    'notes','activity_logs'
  ]
  loop
    execute format('drop policy if exists owner_%1$s on %1$s;', t);
    execute format(
      'create policy "owner_%1$s" on %1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;
