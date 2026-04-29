# 🌡 MoodTrack

Track daily mood dengan XP, streak, dan response dari DB — bukan hardcode.

---

## Stack

- **Frontend + API**: Next.js 14 (App Router)
- **Database + Auth**: Supabase (PostgreSQL + Auth built-in)
- **Confetti**: canvas-confetti

---

## Setup (5 langkah)

### 1. Clone & install
```bash
git clone <repo>
cd moodtrack
npm install
```

### 2. Buat project di Supabase
- Pergi ke [supabase.com](https://supabase.com) → New Project
- Copy **Project URL** dan **anon public key** dari Settings > API

### 3. Set environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local, isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Jalankan schema SQL
- Di Supabase dashboard → SQL Editor
- Copy-paste isi file `sql/schema.sql` → Run

Schema ini akan:
- Buat tabel `users`, `moods`, `responses`
- Seed default responses (range-based, bisa diubah langsung dari DB)
- Setup RLS (Row Level Security)
- Buat trigger auto-create user profile saat signup

### 5. Jalankan dev server
```bash
npm run dev
# Buka http://localhost:3000
```

---

## Fitur yang sudah ada

| Fitur | Detail |
|---|---|
| Auth | Register + Login via Supabase |
| 1 hari 1 input | Enforced di backend + DB unique constraint |
| Slider mood | Emoji berubah sesuai rating, warna dinamis |
| Response dari DB | Bisa ubah pesan tanpa deploy ulang |
| Streak harian | Dihitung otomatis saat submit |
| XP system | +10 base, bonus kalau streak |
| Confetti | Muncul kalau rating ≥ 8 |
| Delay response | 1.8 detik delay kalau mood rendah |
| History 7 hari | Grid emoji + rating di dashboard |

---

## Ubah response message

Cukup update tabel `responses` di Supabase:
```sql
UPDATE responses SET message = 'Teks baru lo' WHERE range_min = 1;
```
Langsung berubah tanpa deploy ulang.

---

## Roadmap (next features)

- [ ] Level system dari total XP
- [ ] Notifikasi pengingat harian
- [ ] Chart mood 30 hari
- [ ] Mood insights / analytics
- [ ] Share streak ke teman
