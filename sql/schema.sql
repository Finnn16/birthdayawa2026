-- ============================================
-- MoodTrack Schema - Supabase / PostgreSQL
-- ============================================

-- 1. USERS (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- 2. RESPONSES (range-based, stored in DB — easy to update without redeploy)
create table public.responses (
  id serial primary key,
  range_min int not null,
  range_max int not null,
  message text not null,
  created_at timestamptz default now()
);

-- Seed default responses
insert into public.responses (range_min, range_max, message) values
  (1,  3,  'hari berat ya... tapi lo udah sampai sini, itu udah kuat banget.'),
  (4,  6,  'lumayan nih — masih bisa digeber besok, pelan-pelan aja.'),
  (7,  9,  'hari lo solid! momentum ini jaga terus ya.'),
  (10, 10, 'GILA. hari lo mantep banget. simpan energi ini 🔥');

-- 3. MOODS (core table)
create table public.moods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null default current_date,
  rating int not null check (rating between 1 and 10),
  note text,
  xp_earned int not null default 10,
  streak_day int not null default 1,
  created_at timestamptz default now(),

  -- ENFORCE: 1 user = 1 entry per day
  constraint moods_user_date_unique unique (user_id, date)
);

-- Index for fast streak/history queries
create index moods_user_id_date_idx on public.moods (user_id, date desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.users enable row level security;
alter table public.moods enable row level security;
alter table public.responses enable row level security;

-- Users can only see/edit their own profile
create policy "users: own row" on public.users
  for all using (auth.uid() = id);

-- Users can only see/edit their own moods
create policy "moods: own rows" on public.moods
  for all using (auth.uid() = user_id);

-- Responses are public read
create policy "responses: public read" on public.responses
  for select using (true);

-- ============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
