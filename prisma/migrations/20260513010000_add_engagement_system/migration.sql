create table if not exists public.heart_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null,
  source_id uuid null,
  amount integer not null,
  note text null,
  metadata_json jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists heart_transactions_user_created_idx
on public.heart_transactions using btree (user_id, created_at desc);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  cost_hearts integer not null,
  category text not null default 'experience',
  is_active boolean not null default true,
  requires_admin_approval boolean not null default true,
  stock_limit integer null,
  metadata_json jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists rewards_active_idx
on public.rewards using btree (is_active, category);

create unique index if not exists rewards_title_unique_idx
on public.rewards using btree (title);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  cost_hearts integer not null,
  note text null,
  admin_note text null,
  requested_at timestamp with time zone default now(),
  approved_at timestamp with time zone null,
  fulfilled_at timestamp with time zone null,
  updated_at timestamp with time zone default now()
);

create index if not exists reward_redemptions_user_requested_idx
on public.reward_redemptions using btree (user_id, requested_at desc);

create index if not exists reward_redemptions_status_idx
on public.reward_redemptions using btree (status, requested_at desc);

create table if not exists public.daily_quest_bank (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  type text not null default 'reflection',
  difficulty text not null default 'easy',
  xp_reward integer not null default 0,
  hearts_reward integer not null default 0,
  prompt text null,
  options_json jsonb null,
  correct_answer text null,
  is_active boolean not null default true,
  metadata_json jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists daily_quest_bank_active_idx
on public.daily_quest_bank using btree (is_active, type);

create unique index if not exists daily_quest_bank_title_unique_idx
on public.daily_quest_bank using btree (title);

create table if not exists public.daily_quest_assignments (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.daily_quest_bank(id) on delete cascade,
  active_date date not null,
  is_active boolean not null default true,
  assigned_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  constraint daily_quest_assignments_quest_date_unique unique (quest_id, active_date)
);

create index if not exists daily_quest_assignments_active_date_idx
on public.daily_quest_assignments using btree (is_active, active_date desc);

create table if not exists public.daily_quest_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.daily_quest_assignments(id) on delete cascade,
  quest_id uuid not null references public.daily_quest_bank(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  active_date date not null,
  answer text null,
  is_correct boolean not null default true,
  xp_earned integer not null default 0,
  hearts_earned integer not null default 0,
  completed_at timestamp with time zone default now(),
  metadata_json jsonb null,
  constraint daily_quest_completions_assignment_user_unique unique (assignment_id, user_id)
);

create index if not exists daily_quest_completions_user_date_idx
on public.daily_quest_completions using btree (user_id, active_date desc);

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null,
  quantity integer not null default 0,
  source_type text not null default 'admin_grant',
  metadata_json jsonb null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint user_inventory_user_item_unique unique (user_id, item_type)
);

create table if not exists public.streak_protection_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null,
  protected_date date not null,
  reason text null,
  created_at timestamp with time zone default now(),
  constraint streak_protection_logs_user_date_unique unique (user_id, protected_date)
);

create table if not exists public.garden_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null,
  source_id uuid null,
  item_type text not null,
  mood_rating integer null,
  earned_date date not null default current_date,
  metadata_json jsonb null,
  created_at timestamp with time zone default now()
);

create index if not exists garden_items_user_date_idx
on public.garden_items using btree (user_id, earned_date desc);

create table if not exists public.couple_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  event_date date not null,
  event_type text not null default 'custom',
  visibility text not null default 'both',
  is_special boolean not null default false,
  is_active boolean not null default true,
  metadata_json jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists couple_events_date_idx
on public.couple_events using btree (event_date desc, is_active);

insert into public.rewards (title, description, cost_hearts, category, requires_admin_approval, metadata_json)
values
  ('Voice note penyemangat', 'Request voice note kecil buat nemenin hari kamu.', 25, 'experience', true, '{}'::jsonb),
  ('Request surat panjang', 'Minta satu surat panjang yang manis dan personal.', 50, 'letter', true, '{}'::jsonb),
  ('Pilih movie night', 'Kamu pilih film buat movie night berikutnya.', 35, 'date', true, '{}'::jsonb),
  ('Request playlist', 'Request playlist kecil sesuai mood kamu.', 30, 'music', true, '{}'::jsonb),
  ('Snack treat', 'Request snack treat yang nanti admin approve.', 45, 'treat', true, '{}'::jsonb),
  ('Streak Shield', 'Item pelindung satu missed day.', 60, 'streak_protection', true, '{"item_type":"streak_shield"}'::jsonb),
  ('Forgiveness Ticket', 'Tiket untuk recover satu missed day dengan approval.', 75, 'streak_protection', true, '{"item_type":"forgiveness_ticket"}'::jsonb)
on conflict do nothing;

insert into public.daily_quest_bank (title, description, type, difficulty, xp_reward, hearts_reward, prompt, options_json)
values
  ('Satu hal baik hari ini', 'Refleksi kecil harian.', 'reflection', 'easy', 8, 3, 'Tulis satu hal kecil yang bikin kamu senyum hari ini.', null),
  ('Self-care check', 'Check-in ringan buat badan kamu.', 'checklist', 'easy', 6, 2, 'Pilih self-care kecil yang sudah kamu lakukan hari ini.', '["Minum air","Makan cukup","Istirahat sebentar","Tarik napas pelan"]'::jsonb),
  ('Pilih vibe hari ini', 'Pilih vibe yang paling cocok.', 'multiple_choice', 'easy', 6, 2, 'Vibe kamu hari ini yang mana?', '["Soft","Lucu","Capek tapi kuat","Butuh peluk"]'::jsonb),
  ('Pesan buat future you', 'Tulis pesan pendek untuk kamu besok.', 'text_answer', 'medium', 10, 4, 'Tulis satu kalimat buat diri kamu besok.', null),
  ('Tiny love prompt', 'Pertanyaan kecil tentang kita.', 'reflection', 'medium', 12, 5, 'Momen kecil apa yang pengen kamu ulang lagi?', null)
on conflict do nothing;
