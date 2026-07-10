-- ============================================================================
-- Helpers: profile trigger, activity logging, invoice numbering, reminder sweep
-- ============================================================================

-- Auto-create a profile + settings row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Sanjib'))
  on conflict (id) do nothing;

  insert into public.app_settings (user_id, owner_name)
  values (new.id, 'Sanjib')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lightweight activity logging (called from server actions).
create or replace function public.log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (user_id, action, entity_type, entity_id, summary)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_summary);
end;
$$;

-- Next invoice number: INV-YYYYMM-<seq> where seq counts existing this month.
create or replace function public.next_invoice_number(p_user uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_prefix text;
  v_count  int;
begin
  v_prefix := 'INV-' || to_char(current_date, 'YYYYMM') || '-';
  select count(*) + 1 into v_count
    from public.invoices
   where user_id = p_user
     and invoice_number like v_prefix || '%';
  return v_prefix || lpad(v_count::text, 3, '0');
end;
$$;

-- Reminders due for sending (due_at <= now and still pending).
create or replace function public.due_reminders()
returns table (
  id uuid, user_id uuid, title text, note text, repeat text, related_type text, related_id uuid
)
language sql
stable
set search_path = public
as $$
  select r.id, r.user_id, r.title, r.note, r.repeat, r.related_type, r.related_id
    from public.reminders r
   where r.status = 'pending'
     and r.due_at <= now()
   order by r.due_at asc;
$$;
