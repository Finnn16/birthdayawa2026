# TDD - Spotify & Weather Integration

## Project: BirthdayAwa2026

## Version: 1.0

## Last Updated: June 2026

---

# 1. Objective

Menambahkan integrasi Spotify dan Weather untuk meningkatkan personalisasi pengalaman pengguna.

Fitur ini akan digunakan untuk:

- Current Playing Presence
- Mood Soundtrack Selection
- Weather Snapshot saat Mood Submit
- Mood History Enrichment
- Music & Mood Analytics
- Relationship Wrapped Data Source

---

# 2. Scope

Included:

- Spotify OAuth Integration
- Spotify Current Playing
- Spotify Recently Played
- Mood Soundtrack Selection
- Weather Snapshot
- Mood History Extension
- Analytics Data Collection

Excluded:

- Playlist Creation
- Spotify Control (Play/Pause)
- Music Recommendation Engine
- AI Generated Insights

---

# 3. High Level Flow

## Spotify Connection

User Login

↓

Settings

↓

Connect Spotify

↓

Spotify OAuth

↓

Access Token Stored

↓

Spotify Connected

---

## Mood Submission

User Submit Mood

↓

Fetch Weather Snapshot

↓

Open Soundtrack Modal

↓

Show Recently Played Songs

↓

User Select Song OR Skip

↓

Save Mood

↓

Save Weather

↓

Save Song Snapshot

---

# 4. Spotify Features

## Feature 1 - Current Playing Presence

### Purpose

Menampilkan lagu yang sedang didengarkan oleh pengguna.

### Dashboard Widget

```text
🎵 Finnn

Backburner
NIKI

Listening Now
```

### Data Source

Spotify API

GET /me/player/currently-playing

### Refresh Strategy

- Polling setiap 5 menit
- Update hanya jika token valid

---

## Feature 2 - Recently Played Songs

### Purpose

Menampilkan daftar lagu yang didengarkan hari ini.

### Data Source

Spotify API

GET /me/player/recently-played

### Limits

Ambil maksimal:

20 Lagu Terakhir

### Usage

Digunakan pada Mood Soundtrack Modal

---

## Feature 3 - Listening Together

### Purpose

Mendeteksi lagu atau artist yang sama.

### Logic

Jika:

Finnn Artist == Awaaa Artist

atau

Finnn Track == Awaaa Track

maka:

Generate Match Event

---

# 5. Weather Features

## Feature 1 - Weather Snapshot

### Purpose

Menyimpan kondisi cuaca saat mood diisi.

### Provider

Open-Meteo

### Data Saved

- Temperature
- Weather Code
- Weather Description
- Is Day
- Rain Probability

### Example

```json
{
  "temperature": 24,
  "weather": "Light Rain",
  "is_day": false
}
```

### Fetch Timing

Saat submit mood.

---

## Feature 2 - Weather Context

### Usage

Hero Message

Quest

Analytics

Wrapped

---

# 6. Mood Soundtrack

## Flow

Submit Mood

↓

Modal Open

↓

Pilih Lagu

atau

Skip

↓

Save

---

## Modal UI

Title:

🎵 Soundtrack Hari Ini

Subtitle:

Ada lagu yang menggambarkan harimu?

---

## Data Source

Spotify Recently Played

---

## Skip Behaviour

User dapat skip.

Mood tetap tersimpan.

---

# 7. Database Design

## spotify_accounts

```sql
id uuid primary key
user_id uuid not null

spotify_user_id text
display_name text

access_token text
refresh_token text

expires_at timestamptz

created_at timestamptz
updated_at timestamptz
```

---

## spotify_presence

```sql
id uuid primary key

user_id uuid not null

track_id text
track_name text

artist_name text

album_name text

album_image text

spotify_url text

is_playing boolean

last_synced_at timestamptz

created_at timestamptz
updated_at timestamptz
```

---

## moods

Additional Fields

```sql
spotify_track_id text null

song_title text null

artist_name text null

album_name text null

album_image text null

weather_temperature numeric null

weather_code integer null

weather_description text null

weather_is_day boolean null
```

Snapshot disimpan permanen.

Tidak mengambil ulang dari Spotify.

---

# 8. API Design

## Spotify Connect

POST

```text
/api/spotify/connect
```

---

## Spotify Callback

GET

```text
/api/spotify/callback
```

---

## Current Playing

GET

```text
/api/spotify/current-playing
```

---

## Recently Played

GET

```text
/api/spotify/recently-played
```

---

## Weather Snapshot

GET

```text
/api/weather/current
```

---

# 9. Scheduler

## Spotify Presence Sync

Interval:

5 Menit

### Task

- Refresh token
- Fetch current playing
- Update spotify_presence

---

## Match Detection

Interval:

15 Menit

### Task

Cek:

- Same Track
- Same Artist

Generate Match Event

---

# 10. Analytics

## Music Analytics

Metrics:

- Most Selected Song
- Most Selected Artist
- Average Mood By Artist
- Average Mood By Song

---

## Weather Analytics

Metrics:

- Average Mood By Weather
- Happy Weather
- Sad Weather
- Rain vs Mood

---

# 11. Wrapped Data

## Music Wrapped

- Most Selected Song
- Most Selected Artist
- Music Match Count

---

## Weather Wrapped

- Most Happy Weather
- Most Common Weather

---

## Combined Wrapped

- Happiest Day
- Mood
- Song
- Weather

---

# 12. Future Enhancement

### Relationship Playlist

Generate playlist dari seluruh soundtrack mood.

### Dynamic Hero Message

Menggunakan:

- Mood
- Weather
- Spotify

### Dynamic Quest

Menggunakan:

- Weather
- Listening Pattern

---

# 13. Success Criteria

Implementasi dianggap berhasil apabila:

- User dapat connect Spotify
- Current Playing tampil di dashboard
- Recently Played tampil pada Mood Modal
- Weather Snapshot tersimpan saat Mood Submit
- Mood dapat dikaitkan dengan lagu
- Data dapat digunakan untuk Analytics
- Data dapat digunakan untuk Wrapped
