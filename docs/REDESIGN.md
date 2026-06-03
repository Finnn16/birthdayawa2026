# PRD — Admin Dashboard Redesign

## Project: BirthdayAwa2026

## Version: 1.0

## Last Updated: June 2026

# 1. Objective

Melakukan redesign pada halaman Admin Dashboard agar lebih sederhana, mudah digunakan, dan fokus terhadap aktivitas utama harian.

Redesign ini bertujuan untuk:

- Mengurangi kompleksitas tampilan admin
- Mengurangi jumlah navigasi/tab yang tidak perlu
- Mempermudah content management
- Mempermudah monitoring engagement user
- Menjadikan admin dashboard terasa lebih “alive” dan informatif
- Menjaga konsistensi UI/UX antar fitur

---

# 2. Current Problems

Berdasarkan struktur fitur saat ini, ditemukan beberapa permasalahan utama:

## 2.1 Terlalu Banyak Tab

Admin dashboard memiliki terlalu banyak menu terpisah sehingga terasa berat dan membingungkan.

Contoh:

- Hero Messages
- Daily Quest Bank
- Daily Quest Assignment
- Rewards
- Redemption
- Letters
- Calendar
- Inventory
- Hearts Management

Sebagian besar menu memiliki pola management yang sebenarnya mirip.

---

## 2.2 Workflow Tidak Natural

Saat admin membuka dashboard, sistem belum memberikan fokus terhadap:

- Aktivitas hari ini
- User engagement hari ini
- Pending actions
- Upcoming events

Admin harus membuka beberapa tab secara manual.

---

## 2.3 Tidak Ada Hierarchy Prioritas

Semua fitur terasa memiliki tingkat prioritas yang sama, padahal:

- Mood tracking merupakan fitur utama
- Quest dan mini-game adalah booster engagement
- Letter dan event adalah special moment
- Reward adalah retention feature

---

# 3. Redesign Principles

## 3.1 Simplicity First

UI harus minimalis dan tidak terlalu padat.

Mengurangi:

- Nested navigation
- Terlalu banyak card kecil
- Terlalu banyak warna
- Informasi yang tidak penting

---

## 3.2 Daily Focused

Dashboard harus berfokus pada aktivitas hari ini.

Admin harus langsung mengetahui:

- Siapa yang belum submit mood
- Quest aktif hari ini
- Upcoming special event
- Pending redemption
- Mood hari ini

---

## 3.3 Reusable Components

Semua management form harus memiliki struktur yang konsisten.

Contoh:

- Title
- Description
- Reward
- Active Date
- Status
- Visibility

Digunakan ulang untuk:

- Quest
- Mini-game
- Hero Message
- Reward
- Letter

---

# 4. New Admin Structure

## Section 1 — Dashboard Overview

Halaman utama admin.

### Purpose

Memberikan ringkasan aktivitas dan engagement harian.

### Components

#### Today Mood Summary

- Mood average hari ini
- Total submission
- User yang belum submit

#### Active Content

- Quest aktif
- Mini-game aktif
- Hero message aktif

#### Upcoming Event

- Countdown anniversary
- Birthday countdown
- Scheduled letter

#### Pending Actions

- Pending redemption
- Pending streak protection

#### Quick Actions

- Create Quest
- Create Hero Message
- Create Letter
- Grant Hearts

---

# 5. Content Studio

Menggabungkan seluruh content management menjadi satu tempat.

## Included Features

- Mini-games
- Daily quests
- Hero messages
- Rewards
- Letters

---

## Content Card Structure

Setiap content menggunakan layout yang sama:

- Title
- Type
- Active Date
- Reward
- Status
- Last Updated
- Quick Edit Button

---

## Benefits

- Konsisten
- Lebih mudah dipelajari
- Mengurangi complexity
- Mempercepat workflow admin

---

# 6. Engagement Analytics

Halaman analytics sederhana dan fokus pada emotional engagement.

## Main Metrics

### Mood Metrics

- Weekly mood average
- Mood trend
- Highest mood day
- Lowest mood day

### Activity Metrics

- Current streak
- Longest streak
- Most active hour
- Total XP earned

### Engagement Score

Simple calculated score berdasarkan:

- Mood consistency
- Quest completion
- Daily activity

---

# 7. Memory Vault

Tempat seluruh memory relationship tersimpan.

## Included Content

- Letters
- Calendar events
- Mood memories
- Special moments

---

## Timeline View

Contoh:

- “25 Mei 2026 — Birthday Letter Opened”
- “27 Mei 2026 — 14 Days Streak Achieved”
- “29 Mei 2026 — Mood Rating 10”

---

# 8. Navigation Redesign

## Old Structure

12+ Tabs

## New Structure

Hanya 4 Navigation Utama:

- Dashboard
- Content Studio
- Analytics
- Memory Vault

---

# 9. UI/UX Direction

## Visual Style

- Clean modern
- Soft romantic tone
- Minimal gradient
- Calm colors
- Spacious layout

---

## Layout Style

Desktop-first layout.

### Recommended Layout

- Left sidebar navigation
- Main content center
- Optional right info panel

---

## Card Design

- Rounded large cards
- Soft shadow
- Minimal border
- Clear typography
- Large spacing

---

# 10. Technical Recommendations

## Frontend

- Next.js App Router
- React Server Components where possible
- Shared reusable form components

---

## State Management

Gunakan:

- React Query / TanStack Query
  untuk dashboard aggregation & caching.

---

## API Aggregation

Dashboard overview sebaiknya menggunakan:
`/api/admin/dashboard-overview`

Agar:

- tidak banyak API call
- loading lebih cepat
- dashboard lebih ringan

---

## Database Optimization

Tambahkan:

- index pada created_at
- index pada user_id
- index pada active_date

Untuk mempercepat analytics & dashboard queries.

---

# 11. Future Expansion

## Potential Features

### Relationship Wrapped

Recap hubungan bulanan/tahunan.

### Mood Replay

AI-like summary:
“Bulan ini kamu paling sering happy di hari Jumat.”

### Open When Letters

Letter terkunci berdasarkan kondisi tertentu:

- mood rendah
- anniversary
- streak milestone

### Passive Presence

Simple online presence:

- last active
- current mood vibe

---

# 12. Success Criteria

Redesign dianggap berhasil apabila:

- Admin dapat mengakses fitur utama lebih cepat
- Jumlah navigation berkurang drastis
- Dashboard terasa lebih hidup
- Workflow content creation lebih sederhana
- User engagement lebih mudah dimonitor
- UI terasa lebih ringan dan modern

---

# 13. Final Notes

Admin dashboard bukan hanya tempat management data.

Admin dashboard harus menjadi:

- control center
- emotional engagement monitor
- content management studio
- relationship memory archive

Dengan redesign ini, BirthdayAwa2026 diharapkan terasa lebih personal, modern, dan nyaman digunakan dalam jangka panjang.
