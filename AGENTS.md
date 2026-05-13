# AGENTS.md

> Instructions for AI coding agents working on the **BirthdayAwa** web app project.

## 1. Project Overview

**BirthdayAwa** is a private, long-term, interactive, responsive web application built around the theme of **love**.

The app is designed for internal use only, with two main users. It should feel fun, romantic, playful, and emotionally meaningful, while still being technically maintainable for long-term development.

The project should not be treated as a one-time birthday page. It should be built as an expandable relationship-themed web app that can keep evolving after the birthday date.

## 2. Product Goal

The main goal is to create a fun and interactive love-themed web app that includes:

- A birthday countdown experience.
- A mood tracking system.
- XP, streak, and level progression.
- Dynamic mini-games managed by an admin.
- Separate dashboard experiences for regular user and admin.
- A responsive design that works well across desktop, tablet, and mobile devices.

The app should make the user feel appreciated, excited, and emotionally connected. Features should encourage repeated daily interaction without feeling boring or too easy to complete.

## 3. Tech Stack

Use the following stack unless explicitly instructed otherwise:

### Backend

- Next.js

### Frontend

- React

### ORM

- Prisma

### Database

- Supabase

### Styling

- Tailwind CSS

### Components

- MUI
- shadcn/ui

When using both MUI and shadcn/ui, avoid creating an inconsistent UI. Keep the existing visual style as the source of truth.

## 4. Project Structure

The app must support at least two main areas:

```txt
app/
  dashboard/
    User-facing dashboard

  admin/
    Admin dashboard
```

Recommended structure:

```txt
app/
  dashboard/
    page.tsx

  admin/
    page.tsx

components/
  ui/
  dashboard/
  admin/
  mood/
  countdown/
  minigames/
  level/

lib/
  prisma.ts
  utils.ts
  xp.ts
  streak.ts
  level.ts

prisma/
  schema.prisma
```

Do not restructure the project aggressively unless there is a clear technical reason.

## 5. Core Features

### 5.1 Birthday Countdown

Create or maintain a countdown feature for the birthday date:

```txt
2026-05-25
```

The countdown should be responsive, visually fun, and emotionally aligned with the love theme.

The countdown should not be hardcoded in many places. Prefer a reusable constant or configuration source.

### 5.2 Mood Tracker

The mood tracker feature already exists in the project.

Agents must preserve the existing mood tracker behavior, components, routes, and data flow unless explicitly instructed otherwise.

The mood tracker should continue to support or be extended to support:

- Daily mood input.
- XP reward after submitting mood.
- Streak tracking.
- Streak-based XP multiplier.
- Dashboard display for current mood history and progress.

Mood tracking should feel rewarding and emotionally supportive, not like a strict productivity tool.

When modifying mood tracking, agents must:

- Review the existing implementation first.
- Avoid breaking current mood submission behavior.
- Avoid changing the existing input format unless requested.
- Add improvements incrementally.
- Keep compatibility with existing mood data.

### 5.3 XP System

The XP system should reward user interaction, especially mood tracking and mini-games.

Rules:

- Mood tracking gives XP.
- Streaks can multiply XP.
- XP gain should be controlled and balanced.
- XP should contribute to love-themed levels.
- XP should not make the user level up too easily.

XP calculation should be placed in a reusable utility, for example:

```txt
lib/xp.ts
```

Avoid scattering XP formula logic across components.

### 5.4 Streak Multiplier Rules

The streak system should encourage consistency.

Required behavior:

- Streak multiplier exists for repeated daily activity.
- The first multiplier cap is at 7 days.
- A new multiplier tier is unlocked at 14 days.
- The maximum streak multiplier scaling should stop at 35 days.

The exact multiplier values may be adjusted, but the system must respect these milestone rules:

```txt
7 days  -> first important streak cap
14 days -> new multiplier tier
35 days -> maximum multiplier cap
```

Recommended example:

```txt
1-6 days    = 1.0x
7-13 days   = 1.2x
14-20 days  = 1.5x
21-34 days  = 1.8x
35+ days    = 2.0x max
```

Agents may propose better balancing, but must not make leveling too fast.

### 5.5 Love-Themed Level System

Create a level system that fits the love theme.

The level progression should feel long-term. It should not be too easy to level up, because the user should always have something to chase.

Level names should feel romantic, playful, and meaningful.

Example level theme:

```txt
Level 1  - First Spark
Level 2  - Sweet Smile
Level 3  - Tiny Crush
Level 4  - Warm Hug
Level 5  - Heart Bloom
Level 6  - Love Letter
Level 7  - Cozy Promise
Level 8  - Deep Bond
Level 9  - Forever Flame
Level 10 - Endless Love
```

The XP requirement should increase progressively. Prefer a formula or config-based level table rather than hardcoding level checks inside UI components.

Recommended approach:

```txt
lib/level.ts
```

### 5.6 Dynamic Mini-Games

The app should include dynamic mini-games to make the experience more fun.

Mini-games must be configurable from the admin side so the admin can change them every day without editing code.

Rules:

- Admin can create, edit, activate, deactivate, and rotate mini-games.
- Admin can change the active mini-game every day.
- Maximum active mini-games: 3.
- Admin can set XP reward for each mini-game.
- Admin can set difficulty level for each mini-game.
- Mini-games should be dynamic enough to rotate or change over time.
- Mini-game completion should be recorded.
- XP from mini-games should feed into the same XP and level system.
- Mini-games should be data-driven where possible.

Recommended difficulty examples:

```txt
Easy
Medium
Hard
```

Recommended configurable mini-game fields:

```txt
Title
Description
Type
Difficulty
XP Reward
Active Date
Is Active
Question / Prompt
Options
Correct Answer
Metadata JSON
```

The `Metadata JSON` field can be used to support different mini-game types without changing the database schema too often.

Recommended dynamic mini-game types:

```txt
Love Quiz
Daily Question
This-or-That
Memory Prompt
Guess the Date
Small Challenge
```

Mini-game logic should be modular so new mini-games can be added later without rewriting the whole system.

## 6. Dashboards

### 6.1 User Dashboard

Route:

```txt
app/dashboard
```

The user dashboard should display:

- Current XP.
- Current level.
- Progress to next level.
- Mood tracker input.
- Mood history or recent mood summary.
- Current streak.
- Available mini-games.
- Birthday countdown.

The dashboard should feel warm, playful, romantic, and motivating.

### 6.2 Admin Dashboard

Route:

```txt
app/admin
```

The admin dashboard should display:

- User XP data.
- User level data.
- Mood tracking analytics.
- Streak data.
- Mini-game management.
- XP reward configuration.
- Difficulty configuration.
- Informative accumulated user data.

Admin should be able to manage mini-games without changing code manually.

## 7. Roles, Authentication, and Authorization

The authentication and login features already exist in the project.

Agents must not rebuild, replace, or remove the existing authentication flow unless explicitly instructed.

The app has two main roles:

```txt
User  -> app/dashboard
Admin -> app/admin
```

Current expected role ownership:

```txt
Admin -> Finnn
User  -> Awa
```

Required behavior:

- Regular user should only access the user dashboard.
- Admin should access the admin dashboard.
- Admin may also view user-facing data if needed.
- Existing login/auth behavior must be preserved.
- Authorization logic must be clear and maintainable.

Avoid relying only on hidden buttons for security. Route-level protection should be implemented or preserved according to the current auth system.

Before changing anything related to auth, agents must inspect the existing implementation first.

## 8. UI/UX Guidelines

Preserve the existing style.

The current visual direction is:

```txt
Clean modern
Existing component-based UI
```

Do not replace the current visual identity unless specifically requested.

The UI should be:

- Clean.
- Modern.
- Romantic.
- Fun.
- Soft.
- Interactive.
- Responsive.
- Mobile-friendly.
- Emotionally expressive.
- Consistent with the current design.

Agents must reuse existing components when possible.

Do not introduce a completely different design system or visual style.

Use animations carefully. Animations should improve the romantic/fun feeling, not make the app heavy or annoying.

When adding components from MUI or shadcn/ui, ensure they visually blend with the existing style.

Before creating new UI components, agents should check whether a similar component already exists.

## 9. Database & Data Modeling Rules

Use Prisma as the ORM and Supabase as the database.

The project already has an existing database schema. Agents must treat the existing schema as the source of truth and must not replace it casually.

### 9.1 Existing Tables

The following tables already exist and must be preserved.

#### `public.users`

```sql
create table public.users (
  id uuid not null,
  username text not null,
  created_at timestamp with time zone null default now(),
  email text null,
  phone_number text null,
  reminder_enabled boolean null default true,
  last_mood_reminder_sent_at timestamp with time zone null,
  last_minigame_reminder_sent_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_username_key unique (username),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
);

create index IF not exists users_phone_number_idx
on public.users using btree (phone_number);
```

Purpose:

- Stores application user profiles.
- Uses `auth.users(id)` as the authentication source.
- Stores username, email, phone number, reminder preferences, and reminder timestamps.

Important rules:

- Do not replace this table with a new user table.
- Do not break the relationship with `auth.users`.
- Use this table for app-level role/profile-related logic when extending the system.

#### `public.responses`

```sql
create table public.responses (
  id serial not null,
  range_min integer not null,
  range_max integer not null,
  message text not null,
  created_at timestamp with time zone null default now(),
  constraint responses_pkey primary key (id)
);
```

Purpose:

- Stores response messages for mood rating ranges.
- Used to return supportive or romantic messages based on mood rating.

Important rules:

- Do not hardcode all mood response messages in the frontend.
- Prefer using this table for configurable mood responses.
- Preserve existing response behavior.

#### `public.moods`

```sql
create table public.moods (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  date date not null default CURRENT_DATE,
  rating integer not null,
  note text null,
  xp_earned integer not null default 10,
  streak_day integer not null default 1,
  created_at timestamp with time zone null default now(),
  constraint moods_pkey primary key (id),
  constraint moods_user_date_unique unique (user_id, date),
  constraint moods_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint moods_rating_check check (
    rating >= 1 and rating <= 10
  )
);

create index IF not exists moods_user_id_date_idx
on public.moods using btree (user_id, date desc);
```

Purpose:

- Stores daily mood entries.
- Enforces one mood entry per user per date.
- Stores mood rating, note, XP earned, and streak day.

Important rules:

- Do not remove the unique constraint on `(user_id, date)`.
- Do not allow duplicate mood submissions for the same user and date unless explicitly requested.
- Preserve the rating range from 1 to 10.
- Preserve existing XP and streak fields.
- Any new XP/streak logic must stay compatible with `xp_earned` and `streak_day`.

### 9.2 Recommended Future Tables

When adding new features, extend the database carefully instead of replacing existing tables.

Recommended additional entities:

```txt
UserRole or role field extension
XpTransaction
LevelConfig
MiniGame
MiniGameCompletion
```

Recommended responsibilities:

### UserRole or Role Field

Used to distinguish between:

```txt
Admin -> Finnn
User  -> Awa
```

If roles already exist in code or metadata, preserve the existing approach. Do not introduce a conflicting role system.

### XpTransaction

Stores XP activity history so XP changes are auditable.

This is recommended because `moods.xp_earned` only stores XP from mood entries. Mini-game XP and future XP sources should be auditable too.

Suggested fields:

```txt
id
user_id
source_type
source_id
xp_amount
multiplier
final_xp
created_at
```

### LevelConfig

Stores level name, required XP, and ordering.

Suggested fields:

```txt
id
level_number
level_name
required_total_xp
created_at
```

### MiniGame

Stores mini-game configuration.

Suggested fields:

```txt
id
title
description
type
difficulty
xp_reward
active_date
is_active
prompt
options_json
correct_answer
metadata_json
created_by
created_at
updated_at
```

### MiniGameCompletion

Stores user mini-game completion history.

Suggested fields:

```txt
id
minigame_id
user_id
is_correct
xp_earned
completed_at
metadata_json
```

### 9.3 Migration Rules

Agents must follow these migration rules:

- Do not drop existing tables.
- Do not rename existing columns unless explicitly requested.
- Do not remove existing constraints unless explicitly requested.
- Prefer additive migrations for new features.
- Keep existing data compatible.
- Review Prisma schema before generating migrations.
- Make sure Prisma models match the existing Supabase schema.

### 9.4 XP Data Rules

Current mood XP is stored in:

```txt
moods.xp_earned
```

Current streak day is stored in:

```txt
moods.streak_day
```

Future XP from mini-games should not be forced into the `moods` table.

Recommended approach:

- Keep mood XP in `moods.xp_earned`.
- Store non-mood XP in `XpTransaction` or a dedicated XP history table.
- Calculate total XP from all XP sources when showing level progress.

Do not design XP logic that ignores existing mood XP.

## 10. Coding Standards

Follow these principles:

- Keep logic reusable.
- Keep components focused.
- Avoid large messy components.
- Avoid duplicated XP, streak, or level logic.
- Use TypeScript when the project supports it.
- Prefer clear naming over clever naming.
- Keep business logic out of UI components when possible.

Recommended utility files:

```txt
lib/xp.ts
lib/streak.ts
lib/level.ts
lib/date.ts
```

## 11. Feature Development Rules

Before changing a feature, understand the existing behavior first.

Critical rule:

> Do not delete existing features, functions, routes, components, or logic unless explicitly requested.

Agents may review existing features and suggest improvements, but must not remove working functionality without permission.

When improving existing code:

- Preserve current behavior.
- Explain the reason for the change.
- Keep backward compatibility when possible.
- Avoid unnecessary rewrites.
- Prefer small, safe, incremental changes.

## 12. API & Backend Rules

Backend logic should be implemented using Next.js conventions.

API/server actions should:

- Validate input.
- Check authorization.
- Keep XP and streak updates consistent.
- Avoid duplicate submissions when daily limits exist.
- Return clear errors.

XP-related backend operations should be transactional when possible.

Example flow for mood submission:

```txt
1. Validate user.
2. Check if mood for today already exists.
3. Save mood entry.
4. Calculate streak.
5. Calculate XP reward and multiplier.
6. Create XP transaction.
7. Update user progress if needed.
8. Return updated dashboard data.
```

## 13. Error Handling & Validation

Use clear validation for:

- Mood input.
- Mini-game XP reward.
- Mini-game difficulty.
- Active mini-game limit.
- Admin-only actions.
- Daily submission rules.

Errors should be friendly and understandable.

Avoid exposing raw database errors to the UI.

## 14. Testing Requirements

At minimum, important business rules should be testable:

- XP calculation.
- Streak multiplier calculation.
- Level progression.
- Maximum 3 active mini-games.
- Admin-only mini-game management.
- Daily mood submission rules.

Testing is especially important for XP, streak, and level logic because these systems affect long-term user progress.

## 15. Security Requirements

Because the app is internal, do not overcomplicate security, but do not ignore it.

Required security principles:

- Protect admin routes.
- Validate all server-side inputs.
- Do not trust client-side role checks only.
- Do not expose sensitive environment variables.
- Use environment variables for database connection and secrets.

## 16. Performance Requirements

The app should feel smooth and responsive.

Guidelines:

- Avoid unnecessary heavy animations.
- Avoid loading all historical mood data if only recent data is needed.
- Use pagination or summary queries for admin analytics if data grows.
- Keep dashboard queries efficient.

## 17. Deployment & Environment Rules

Use environment variables for configuration.

Expected environment variables may include:

```txt
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_APP_URL
```

Do not hardcode secrets in the repository.

## 18. Agent Workflow

When working on this project, agents should follow this workflow:

```txt
1. Read the existing code first.
2. Identify affected files.
3. Preserve existing features and functions.
4. Reuse existing components and style patterns.
5. Make the smallest safe change.
6. Keep styling consistent with the existing app.
7. Extract reusable business logic when needed.
8. Validate role and permission requirements.
9. Check XP, streak, and level impact.
10. Explain changes clearly.
```

Important existing features:

```txt
Authentication/login already exists.
Mood tracker already exists.
Existing clean modern components already exist.
```

Agents must treat these as existing foundations and extend them carefully.

## 19. Do and Don't

### Do

- Preserve the existing style.
- Keep the app romantic and fun.
- Build features for long-term use.
- Keep XP and level progression balanced.
- Use reusable logic for XP, streak, and levels.
- Keep admin and user routes clearly separated.
- Suggest improvements when helpful.

### Don't

- Do not delete existing features or functions.
- Do not rewrite the entire app without permission.
- Do not make leveling too easy.
- Do not hardcode business rules in many places.
- Do not ignore authorization for admin features.
- Do not create inconsistent UI by mixing component libraries carelessly.
- Do not expose raw database errors to users.
