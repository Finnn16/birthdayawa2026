# TDD - Typography System & Content Writing Guideline

## Project: BirthdayAwa2026

## Version: 1.0

---

# Tujuan

Membuat sistem typography yang konsisten di seluruh aplikasi agar:

- Tampilan lebih rapi
- Hierarki informasi lebih jelas
- Mudah dibaca
- Terlihat lebih premium
- Memiliki identitas visual yang konsisten

Perubahan ini tidak mengubah business logic.

Perubahan hanya mencakup:

- Font
- Ukuran teks
- Font weight
- Line height
- Penulisan konten
- Konsistensi heading

---

# Permasalahan Saat Ini

Saat ini setiap section menggunakan ukuran teks yang berbeda-beda.

Akibatnya:

- Dashboard terasa kurang rapi
- Mata user sulit mengenali informasi penting
- Setiap card terasa memiliki aturan sendiri
- Tampilan masih terasa seperti kumpulan komponen, bukan sebuah produk

---

# Font Utama

Gunakan:

```text
Plus Jakarta Sans
```

Alasan:

- Cocok untuk Bahasa Indonesia
- Modern
- Friendly
- Tetap terasa premium
- Mudah dibaca pada desktop maupun mobile

Fallback:

```css
font-family: "Plus Jakarta Sans", sans-serif;
```

---

# Typography Scale

Hanya boleh menggunakan ukuran berikut.

Jangan membuat ukuran font baru di luar sistem ini.

---

## Label

Digunakan untuk:

- MOOD CHECK-IN
- COUPLE CALENDAR
- MOOD GARDEN
- REWARD CENTER

Style:

```css
font-size: 12px;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
```

---

## Caption

Digunakan untuk:

- tanggal
- streak
- reward
- informasi tambahan

Style:

```css
font-size: 14px;
font-weight: 500;
line-height: 20px;
```

---

## Body

Digunakan untuk:

- deskripsi
- hero message
- isi quest
- catatan mood

Style:

```css
font-size: 16px;
font-weight: 400;
line-height: 26px;
```

---

## Card Title

Digunakan untuk:

- Nonton Spiderman
- Movie Date
- Soundtrack Hari Ini
- Mood Hari Ini

Style:

```css
font-size: 20px;
font-weight: 600;
line-height: 28px;
```

---

## Section Title

Digunakan untuk:

- Agenda Dekat
- Mood Garden
- Riwayat Mood
- Reward Center

Style:

```css
font-size: 32px;
font-weight: 600;
line-height: 40px;
```

---

## Hero Title

Digunakan untuk:

- Countdown Event
- AI Hero Message

Style:

```css
font-size: 48px;
font-weight: 700;
line-height: 54px;
```

---

# Aturan Penulisan Bahasa

Seluruh aplikasi menggunakan Bahasa Indonesia.

---

## Jangan Gunakan

```text
Upcoming Event
Reward Shop
History
Daily Hub
Mood Check-In
```

---

## Gunakan

```text
Agenda Dekat
Pusat Hadiah
Riwayat Mood
Aktivitas Hari Ini
Mood Hari Ini
```

---

# Tone Bahasa

Tone aplikasi:

```text
Hangat
Personal
Santai
Natural
Tidak Formal
Tidak Alay
Tidak Terlalu Romantis
```

---

## Contoh Yang Benar

```text
Gimana hari ini?
```

```text
Ada cerita yang ingin disimpan hari ini?
```

```text
Senang lihat kamu baik-baik aja.
```

```text
Mood hari ini cukup bagus ya.
```

---

## Contoh Yang Tidak Digunakan

```text
Silakan masukkan kondisi emosional Anda.
```

```text
Terima kasih telah menggunakan sistem mood tracker.
```

```text
Selamat datang pada dashboard pengguna.
```

---

# Aturan Judul

Semua judul menggunakan:

```text
Title Case
```

Contoh:

```text
Agenda Dekat
Mood Garden
Pusat Hadiah
Riwayat Mood
```

Bukan:

```text
AGENDA DEKAT
agenda dekat
```

---

# Aturan Hero Message

Maksimal:

- 1 headline
- 1 paragraf pendek

---

## Contoh

Headline:

```text
Senang lihat kamu baik-baik aja.
```

Body:

```text
Kemarin kelihatannya harimu cukup tenang.
Semoga hari ini juga berjalan menyenangkan ya.
```

---

# Aturan Tombol

Gunakan bahasa yang sederhana.

---

## Gunakan

```text
Simpan Mood
Buka Hadiah
Lihat Semua
Main Sekarang
Isi Mood
```

---

## Hindari

```text
Submit
Execute
Proceed
Open Reward Center
```

---

# Refactor Component

Buat reusable typography component:

```text
TextLabel
TextCaption
TextBody
TextCardTitle
TextSectionTitle
TextHeroTitle
```

Semua halaman wajib menggunakan component ini.

Tidak boleh menggunakan ukuran font langsung di halaman.

---

# Success Criteria

Typography dianggap berhasil apabila:

- Seluruh halaman menggunakan sistem ukuran yang sama
- Tidak ada heading yang menggunakan ukuran acak
- Bahasa Indonesia digunakan secara konsisten
- Dashboard terasa lebih rapi
- Hero section lebih mudah dibaca
- User dapat mengenali informasi penting dalam 3 detik pertama
- Tampilan terasa seperti satu produk yang utuh
