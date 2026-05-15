create index if not exists couple_events_dashboard_idx
on public.couple_events using btree (is_active, visibility, event_date);

create index if not exists hero_messages_dashboard_idx
on public.hero_messages using btree (is_active, active_date desc, created_at desc);

create index if not exists mini_game_completions_user_game_idx
on public.mini_game_completions using btree (user_id, minigame_id);

create index if not exists daily_quest_completions_user_assignment_idx
on public.daily_quest_completions using btree (user_id, assignment_id);

create index if not exists reward_redemptions_user_requested_idx
on public.reward_redemptions using btree (user_id, requested_at desc);
