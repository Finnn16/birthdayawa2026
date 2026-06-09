# TDD - Dashboard Redesign V2

## Project: BirthdayAwa2026

## Version: 2.0

---

# Objective

Melakukan redesign User Dashboard agar:

- Lebih ringkas
- Mengurangi scroll
- Memperjelas hierarchy informasi
- Meningkatkan emotional impact
- Meningkatkan visibility gamification system

Business logic tidak boleh berubah.

Database schema tidak boleh berubah.

API tidak boleh berubah.

Perubahan hanya pada:

- Layout
- Component Composition
- Information Hierarchy
- Visual Emphasis

---

# Current Problems

## Problem 1

Hero Message memiliki visual weight yang sama dengan Countdown Event.

Akibat:

User tidak memiliki fokus utama saat pertama membuka dashboard.

---

## Problem 2

XP dan Level System kurang terlihat.

Akibat:

Gamification terasa kurang penting.

---

## Problem 3

Dashboard terlalu panjang.

Akibat:

User harus scroll terlalu jauh.

---

## Problem 4

Reward Shop tidak memberikan motivasi untuk mengumpulkan Hearts.

---

## Problem 5

History tidak memberikan insight.

Hanya berfungsi sebagai list data.

---

# New Dashboard Hierarchy

Dashboard harus mengikuti urutan berikut:

```text
Profile Summary

↓

Hero Section

↓

Daily Activities

↓

Rewards

↓

Insights

↓

History
```

---

# Section 1

## Profile Summary Card

Tetap berada di bagian atas.

Tambahkan:

- Level Badge
- XP Progress
- Current Streak
- Multiplier

---

## XP Progress

Current:

20 / 600 XP

Redesign:

Progress bar harus memiliki visual emphasis lebih tinggi.

Requirements:

- Progress bar lebih tebal
- Persentase progress terlihat
- Level lebih menonjol

---

# Section 2

## Hero Section

Layout:

2 Columns

---

### Left Side

Countdown Event

Current Event

Countdown Timer

---

### Right Side

AI Hero Message

Hero Message menjadi:

- lebih kecil
- lebih fokus pada readability

---

## Hero Message Rules

Maximum:

3 baris utama

1 paragraf pendukung

---

## Example

Headline:

Senangnya lihat kamu baik-baik aja

Body:

Kemarin kamu terlihat cukup tenang dan bahagia.
Semoga hari ini juga berjalan baik ya.

---

## Size Adjustment

Reduce current heading size:

30-40%

---

# Section 3

## Daily Activities

Current:

Mood
Quest
Mini Game

Tetap dipertahankan.

---

### Improvement

Tab Navigation harus sticky ketika user scroll.

---

### Add Progress Status

Mood:

Completed / Not Completed

Quest:

Completed / Not Completed

Mini Game:

Completed / Not Completed

---

# Section 4

## Reward Center Redesign

Rename:

Reward Shop

Menjadi:

Reward Center

---

### Hearts Summary

Display:

Current Hearts

---

### Next Reward

Tambahkan:

Reward berikutnya

Contoh:

```text
Movie Date

8 Hearts

Kamu butuh 3 Hearts lagi
```

---

### Progress

Tambahkan progress visual.

---

# Section 5

## Couple Calendar

Tetap dipertahankan.

---

### Improvement

Upcoming Event Card

Highlight event terdekat.

---

# Section 6

## Insight Widget

Section baru.

---

### Mood Insight

Example:

```text
Average Mood

7.4
```

---

### Weekly Trend

Example:

```text
Mood minggu ini lebih baik
dibanding minggu lalu.
```

---

### Future Data Source

Mood

Weather

Music

AI Hero

---

# Section 7

## History Redesign

Current:

List biasa.

---

### New Layout

Summary Card

-

History List

---

### Summary

Display:

Highest Mood

Lowest Mood

Average Mood

Current Streak

---

### History Row

Display:

Date

Mood Emoji

Mood Score

XP Earned

Hero Message Generated Indicator

---

# Section 8

## Future Widget Area

Reserve Space

For:

- Spotify Presence
- Weather Snapshot
- Music Mood
- Relationship Wrapped

Do not implement yet.

Create placeholder component architecture.

---

# Component Refactor

Create reusable components:

```text
CardContainer
SectionHeader
ProgressBar
StatBadge
InsightCard
ActivityStatus
RewardProgress
HeroMessageCard
CountdownCard
HistoryItem
```

---

# Responsive Requirements

Desktop First

Target Width:

1280px+

---

Tablet:

2-column layout tetap dipertahankan.

---

Mobile:

Stack vertically.

---

# Non Functional Requirements

Do not modify:

- Database
- API
- Authentication
- Business Rules
- Mood Logic
- Quest Logic
- Reward Logic

Only modify:

- Layout
- Components
- Styling
- User Experience

---

# Success Criteria

Dashboard terasa:

- Lebih ringkas
- Lebih personal
- Lebih emosional
- Lebih fokus pada Hero Message
- Lebih fokus pada Gamification
- Lebih sedikit scrolling

Without changing existing functionality.
