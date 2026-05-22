create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  trigger_date date not null,
  audio_url text,
  is_active boolean not null default true,
  metadata_json jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.letter_pages (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  page_number integer not null,
  headline text not null,
  subtitle text,
  image_url text,
  image_position text default 'left',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint letter_pages_letter_id_page_number_key unique (letter_id, page_number)
);

create table if not exists public.letter_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.letter_pages(id) on delete cascade,
  section_number integer not null,
  title text,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint letter_sections_page_id_section_number_key unique (page_id, section_number)
);

create index if not exists letters_is_active_trigger_date_idx
  on public.letters (is_active, trigger_date desc);

create index if not exists letter_pages_letter_id_idx
  on public.letter_pages (letter_id);

create index if not exists letter_sections_page_id_idx
  on public.letter_sections (page_id);
