create table if not exists public.hero_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  tone text not null default 'soft',
  active_date date null,
  is_active boolean not null default true,
  metadata_json jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists hero_messages_active_date_idx
on public.hero_messages using btree (is_active, active_date desc, created_at desc);

insert into public.hero_messages (title, body, tone, is_active)
select
  'Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.',
  'Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya.',
  'soft',
  true
where not exists (select 1 from public.hero_messages);
