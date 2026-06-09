# TDD - AI Generated Hero Message System

## Project: BirthdayAwa2026

## Version: 1.0

## Last Updated: June 2026

---

# 1. Objective

Membuat sistem Hero Message yang dihasilkan secara otomatis menggunakan AI berdasarkan Mood Entry yang diisi pengguna pada hari sebelumnya.

Tujuan utama:

- Mengurangi kebutuhan membuat Hero Message manual
- Meningkatkan personalisasi
- Membuat user merasa dipahami
- Memanfaatkan data Mood Tracker yang sudah tersedia
- Menjadikan dashboard lebih hidup setiap hari

---

# 2. Background

Saat ini Hero Message dibuat secara manual oleh administrator.

Kelemahan:

- Membutuhkan maintenance terus menerus
- Pesan sering terasa generik
- Tidak memperhatikan kondisi user sebelumnya

Solusi:

Menghasilkan Hero Message berdasarkan:

- Mood Rating
- Mood Note
- Mood Trend
- Weather Snapshot (future enhancement)
- Music Mood (future enhancement)

---

# 3. User Flow

User mengisi Mood

↓

User mengisi Note

↓

Mood tersimpan

↓

Scheduler berjalan setiap pagi

↓

AI membaca Mood kemarin

↓

AI membuat:

- Summary
- Hero Message

↓

Disimpan ke Database

↓

Dashboard menampilkan Hero Message hari ini

---

# 4. Functional Requirements

## Generate Daily Hero Message

Setiap user mendapatkan maksimal:

1 Hero Message per hari

Source:

Mood hari sebelumnya

---

## Hero Message Generation Rules

Jika Mood memiliki note:

Gunakan note sebagai konteks utama.

Jika Mood tidak memiliki note:

Gunakan rating mood sebagai konteks.

---

## Fallback Logic

Jika AI gagal:

Gunakan Hero Message Template berdasarkan Mood Rating.

---

# 5. Mood Interpretation Rules

## Mood 1 - 3

Tone:

- Supportive
- Gentle
- Encouraging

Example:

Hari kemarin terasa berat ya.
Tidak apa-apa, kamu tidak harus kuat setiap saat.

---

## Mood 4 - 6

Tone:

- Calm
- Companion
- Reflective

Example:

Terima kasih sudah bertahan sampai hari ini.
Semoga hari ini terasa sedikit lebih ringan.

---

## Mood 7 - 9

Tone:

- Positive
- Appreciative
- Cheerful

Example:

Senang melihat harimu berjalan cukup baik kemarin.
Semoga energi baik itu tetap menemani hari ini.

---

## Mood 10

Tone:

- Celebration
- Playful
- Romantic

Example:

Wah, kemarin kelihatannya seru banget 😆
Semoga hari ini bisa lebih menyenangkan lagi.

---

# 6. AI Prompt Design

## Input

Mood Rating

Mood Note

Mood Date

---

## Example Payload

Rating:

4

Note:

Hari ini capek banget, kerjaan numpuk dan rasanya kurang maksimal.

---

## Prompt

Buat Hero Message pendek maksimal 2 kalimat.

Gunakan bahasa Indonesia yang hangat dan natural.

Jangan terdengar seperti motivator.

Jangan terlalu formal.

Jangan terlalu berlebihan.

Berdasarkan:

Mood Rating: 4

Mood Note:
Hari ini capek banget, kerjaan numpuk dan rasanya kurang maksimal.

---

## Expected Output

Kemarin mungkin terasa berat dan melelahkan.
Tidak apa-apa berjalan pelan, hari ini kamu bisa mencoba lagi dengan lebih ringan.

---

# 7. Database Design

## ai_hero_messages

```sql
id uuid primary key default gen_random_uuid()

user_id uuid not null references users(id)

source_mood_id uuid not null references moods(id)

title text null

summary text null

message text not null

tone text not null

generation_source text not null

active_date date not null

is_active boolean default true

created_at timestamptz default now()

updated_at timestamptz default now()
```

---

## Generation Source

Valid Values:

```text
ai
fallback
manual
```

---

# 8. Scheduler

## Generate Hero Message

Cron Schedule:

06:00 Every Day

---

## Steps

1. Cari Mood kemarin
2. Ambil Rating
3. Ambil Note
4. Generate Hero Message
5. Simpan ke ai_hero_messages

---

## Skip Condition

Jika Hero Message hari ini sudah ada:

STOP

---

# 9. Dashboard Logic

Saat Dashboard dibuka:

```sql
SELECT *
FROM ai_hero_messages
WHERE user_id = current_user
AND active_date = CURRENT_DATE
LIMIT 1
```

---

# 10. Fallback System

Jika:

- AI Timeout
- API Error
- Quota Limit

Maka gunakan:

hero_message_templates

---

## Template Table

```sql
id uuid primary key

min_rating integer

max_rating integer

message text

is_active boolean
```

---

# 11. Future Enhancement

## Mood Trend Analysis

AI dapat melihat:

7 hari terakhir

Contoh:

Mood meningkat selama 4 hari berturut-turut.

---

## Weather Integration

Input tambahan:

- Temperature
- Weather Condition

Contoh:

Hujan ringan kemarin ya 🌧️
Semoga hari ini tetap terasa hangat.

---

## Music Integration

Input tambahan:

- Song Title
- Artist

Contoh:

Kemarin ditemani Every Summertime ya 🎵
Semoga hari ini juga membawa banyak momen manis.

---

## Personalized Nickname

Contoh:

Hai Acuu 🫶

Semoga hari ini lebih baik dari kemarin.

---

# 12. Safety Rules

Jika Mood Note mengandung kata:

- bunuh diri
- mati
- menghilang
- menyerah hidup
- ingin hilang

Maka:

Jangan gunakan prompt normal.

Gunakan Support Template.

Flag:

requires_review = true

---

# 13. Analytics

Metrics:

- Total Generated
- AI Success Rate
- Fallback Rate
- Average Mood By Tone
- Most Used Tone

---

# 14. Success Criteria

Sistem dianggap berhasil apabila:

- Hero Message muncul otomatis setiap hari
- Hero Message relevan dengan Mood sebelumnya
- Tidak memerlukan input manual admin
- Fallback berjalan ketika AI gagal
- Dashboard selalu memiliki Hero Message aktif

---

# 15. Final Vision

Hero Message tidak lagi menjadi konten statis.

Hero Message harus terasa seperti surat kecil yang dibuat khusus untuk user setiap pagi berdasarkan bagaimana hari mereka berjalan sebelumnya.

Dengan pendekatan ini, BirthdayAwa2026 dapat memberikan pengalaman yang lebih personal, emosional, dan berkesan dibandingkan mood tracker biasa.
