-- ============================================================================
-- AI Memory — long-term memory brain for the chatbot
-- ============================================================================

create table if not exists ai_memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category    text not null default 'general'
              check (category in ('general','project','client','preference','instruction','fact','goal')),
  content     text not null,
  importance  integer not null default 5 check (importance between 1 and 10),
  source      text default 'conversation',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table ai_memories enable row level security;
drop policy if exists owner_ai_memories on ai_memories;
create policy "owner_ai_memories" on ai_memories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Indexes
create index if not exists idx_ai_memories_user on ai_memories(user_id);
create index if not exists idx_ai_memories_category on ai_memories(user_id, category);
create index if not exists idx_ai_memories_importance on ai_memories(user_id, importance desc);
