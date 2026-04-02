-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Streak tracking + Personal records
-- ═══════════════════════════════════════════════════════════════

-- Streak columns on users
alter table public.users
  add column if not exists current_streak int not null default 0,
  add column if not exists best_streak int not null default 0,
  add column if not exists last_active_date date;

-- Add new bosses if not already seeded
insert into public.bosses (id, name, hp, time_limit_secs, xp_reward, difficulty, required_level, is_free) values
  ('jinn',        'DJINN',       45, 240, 300, 'medium', 4, true),
  ('medusa',      'MEDUSA',      65, 360, 450, 'hard',   6, false),
  ('demon_slime', 'DEMON SLIME', 100, 480, 800, 'boss',  10, false)
on conflict (id) do nothing;

-- Personal records table
create table if not exists public.user_records (
  user_id   uuid not null references public.users(id) on delete cascade,
  boss_id   text not null references public.bosses(id) on delete cascade,
  best_reps int not null default 0,
  best_time_secs int, -- null = no victory yet
  updated_at timestamptz not null default now(),
  primary key (user_id, boss_id)
);

-- RLS for user_records
alter table public.user_records enable row level security;

create policy "users_select_own_records" on public.user_records
  for select using (auth.uid() = user_id);

create policy "users_upsert_own_records" on public.user_records
  for insert with check (auth.uid() = user_id);

create policy "users_update_own_records" on public.user_records
  for update using (auth.uid() = user_id);

-- Index for quick lookups
create index if not exists idx_user_records_user on public.user_records(user_id);
