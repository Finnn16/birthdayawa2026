alter table public.users
add column if not exists role text not null default 'user';

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null,
  source_id uuid null,
  xp_amount integer not null,
  multiplier numeric(4, 2) not null default 1,
  final_xp integer not null,
  created_at timestamp with time zone default now()
);

create index if not exists xp_transactions_user_created_idx
on public.xp_transactions using btree (user_id, created_at desc);

create table if not exists public.level_configs (
  id uuid primary key default gen_random_uuid(),
  level_number integer not null unique,
  level_name text not null,
  required_total_xp integer not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists public.mini_games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  type text not null,
  difficulty text not null,
  xp_reward integer not null,
  active_date date null,
  is_active boolean not null default false,
  prompt text null,
  options_json jsonb null,
  correct_answer text null,
  metadata_json jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists mini_games_active_date_idx
on public.mini_games using btree (is_active, active_date);

create table if not exists public.mini_game_completions (
  id uuid primary key default gen_random_uuid(),
  minigame_id uuid not null references public.mini_games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_correct boolean not null default false,
  xp_earned integer not null default 0,
  completed_at timestamp with time zone default now(),
  metadata_json jsonb null,
  constraint mini_game_completions_minigame_user_unique unique (minigame_id, user_id)
);

create index if not exists mini_game_completions_user_completed_idx
on public.mini_game_completions using btree (user_id, completed_at desc);

insert into public.level_configs (level_number, level_name, required_total_xp)
values
  (1, 'First Spark', 0),
  (2, 'Sweet Smile', 80),
  (3, 'Tiny Crush', 190),
  (4, 'Warm Hug', 340),
  (5, 'Heart Bloom', 540),
  (6, 'Love Letter', 800),
  (7, 'Cozy Promise', 1130),
  (8, 'Deep Bond', 1540),
  (9, 'Forever Flame', 2040),
  (10, 'Endless Love', 2640)
on conflict (level_number) do nothing;
