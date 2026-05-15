alter table public.streak_protection_logs
add column if not exists status text not null default 'approved',
add column if not exists requested_at timestamp with time zone default now(),
add column if not exists approved_at timestamp with time zone null,
add column if not exists reviewed_by uuid null references public.users(id) on delete set null,
add column if not exists admin_note text null,
add column if not exists previous_streak_day integer null;

update public.streak_protection_logs
set status = 'approved',
    approved_at = coalesce(approved_at, created_at)
where status is null or status = '';

create index if not exists streak_protection_logs_status_requested_idx
on public.streak_protection_logs using btree (status, requested_at desc);
