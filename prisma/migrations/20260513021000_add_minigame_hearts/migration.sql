alter table public.mini_games
add column if not exists hearts_reward integer not null default 0;

alter table public.mini_game_completions
add column if not exists hearts_earned integer not null default 0;
