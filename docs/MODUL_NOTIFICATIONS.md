# PRD - Notification Center & Campaign Management System

## Project: BirthdayAwa2026

## Version: 1.0

## Last Updated: June 2026

# 1. Objective

Membangun sistem Notification Center yang fleksibel dan sepenuhnya dikelola melalui Admin Dashboard.

Sistem ini memungkinkan administrator untuk:

- Membuat notification campaign
- Mengatur jadwal pengiriman notifikasi
- Menentukan trigger condition
- Menentukan isi pesan notifikasi
- Mengirim notifikasi manual
- Membuat reminder berbasis event
- Mengelola seluruh reminder tanpa perlu melakukan perubahan kode

Tujuan utama adalah mengubah sistem notifikasi dari hardcoded reminder menjadi data-driven notification system.

---

# 2. Background

Saat ini pendekatan reminder umumnya menggunakan rule tetap seperti:

- Mood reminder jam 20:00
- Quest reminder jam 19:00
- Mini game reminder jam 19:30

Pendekatan ini memiliki keterbatasan:

- Pesan sulit dikustomisasi
- Sulit membuat reminder baru
- Membutuhkan perubahan kode ketika ingin menambah jenis reminder
- Tidak fleksibel untuk event khusus

Oleh karena itu diperlukan sistem notification campaign yang dapat dikelola sepenuhnya melalui admin panel.

---

# 3. Goals

## Functional Goals

- Admin dapat membuat notification campaign
- Admin dapat menentukan trigger
- Admin dapat menentukan jadwal
- Admin dapat menentukan isi pesan
- Admin dapat mengirim notifikasi manual
- Admin dapat membuat countdown event notification
- Admin dapat membuat multiple reminder untuk fitur yang sama

---

## Non Functional Goals

- Zero Cost Operation
- Fully Configurable
- Data Driven
- Extensible
- Mobile Friendly
- Compatible dengan PWA

---

# 4. Notification Center Module

Notification Center menjadi modul baru dalam Admin Dashboard.

Menu:

```text
Notification Center
├── Campaigns
├── Message Pool
├── Trigger Rules
├── Manual Broadcast
├── Delivery History
└── Notification Analytics
```

---

# 5. Notification Campaign

Notification Campaign merupakan konfigurasi utama pengiriman notifikasi.

Setiap campaign memiliki:

- Nama campaign
- Tipe notifikasi
- Trigger
- Jadwal
- Message Pool
- Status aktif

---

## Example

Campaign:

Mood Reminder

Trigger:

Mood Belum Diisi

Schedule:

20:00

Status:

Active

---

# 6. Notification Types

Supported Notification Type:

```text
mood
quest
minigame
event
reward
letter
streak
system
custom
```

---

## Example

Mood Reminder

Quest Reminder

Mini Game Reminder

Anniversary Reminder

Birthday Reminder

Letter Unlock Reminder

Reward Available Reminder

---

# 7. Trigger System

Campaign dapat menggunakan trigger tertentu.

Supported Trigger:

```text
mood_not_filled
quest_not_completed
minigame_not_played
streak_milestone
event_countdown
letter_unlocked
reward_available
always_send
manual_send
```

---

# 8. Conditional Notification

## Mood Reminder

Trigger:

mood_not_filled

Flow:

1. Scheduler berjalan
2. Cek apakah user sudah mengisi mood hari ini
3. Jika sudah → tidak kirim notifikasi
4. Jika belum → kirim notifikasi

---

## Quest Reminder

Trigger:

quest_not_completed

Flow:

1. Cek quest aktif hari ini
2. Cek completion status
3. Jika belum selesai → kirim notifikasi

---

## Mini Game Reminder

Trigger:

minigame_not_played

Flow:

1. Cek mini game aktif
2. Cek apakah sudah dimainkan
3. Jika belum → kirim notifikasi

---

# 9. Always Send Notification

Campaign tanpa syarat.

Trigger:

always_send

Contoh:

Jam:

08:00

Pesan:

"Semoga harimu menyenangkan hari ini ☀️"

Notifikasi akan selalu dikirim.

---

# 10. Manual Broadcast

Administrator dapat mengirim notifikasi secara langsung.

Menu:

Notification Center → Manual Broadcast

Input:

- Title
- Message
- Target User
- Send Now

---

## Example

Title:

Hai Kamu

Message:

Jangan lupa minum air hari ini ya 🫶

Action:

Send Now

---

# 11. Event Countdown Notification

Campaign berbasis event.

Contoh:

Birthday

Anniversary

Special Day

Letter Unlock

---

## Example

3 Hari Sebelum Ulang Tahun

Pesan:

"Ada sesuatu yang spesial sebentar lagi 🤍"

---

## Example

1 Hari Sebelum Anniversary

Pesan:

"Besok adalah hari yang spesial untuk kita 😆"

---

# 12. Message Pool System

Setiap campaign dapat memiliki lebih dari satu pesan.

Tujuan:

Menghindari notifikasi yang monoton.

---

## Example

Campaign:

Mood Reminder

Message Pool:

1.

"Hari ini belum ditutup nih 🫶"

2.

"Aku penasaran hari kamu gimana hari ini 😆"

3.

"Jangan lupa isi mood sebelum tidur ya 🤍"

4.

"Tinggal satu langkah lagi sebelum hari ini selesai 😴"

---

## Sending Logic

Saat trigger terpenuhi:

System memilih satu pesan secara random.

---

# 13. Notification Schedule

Setiap campaign memiliki:

- Start Date
- End Date
- Send Time
- Timezone

---

## Example

Campaign:

Quest Reminder

Send Time:

19:00

Start Date:

2026-06-01

End Date:

2026-12-31

---

# 14. Database Design

## notification_campaigns

Fields:

```text
id
name
notification_type
trigger_type
send_time

publish_status
publish_at

is_active

created_by
created_at
updated_at
```

---

## notification_messages

Fields:

```text
id
campaign_id
title
body
weight
is_active
created_at
```

---

## notification_delivery_logs

Fields:

```text
id
campaign_id
user_id

notification_title
notification_body

status

sent_at
delivered_at
created_at
```

---

# 15. Delivery History

Admin dapat melihat:

- Notification Sent
- Notification Delivered
- Failed Notification
- Delivery Time

---

## Example

Mood Reminder

Sent:

200

Delivered:

198

Failed:

2

Success Rate:

99%

---

# 16. Notification Analytics

Metrics:

- Total Sent
- Total Delivered
- Total Failed
- Open Rate
- Most Effective Campaign
- Most Effective Message

---

# 17. Future Enhancements

## Smart Reminder

Jika user biasanya mengisi mood pukul 22:00 maka reminder dikirim mendekati jam tersebut.

---

## AI Message Rotation

System otomatis memilih pesan terbaik berdasarkan engagement.

---

## Smart Escalation

Reminder pertama:

Friendly

Reminder kedua:

Sedikit lebih persuasif

Reminder ketiga:

Humorous

---

## Personalized Message Variables

Contoh:

```text
Halo {username} 🫶

Hari ini kamu belum mengisi mood.
```

---

# 18. Success Criteria

Sistem dianggap berhasil apabila:

- Reminder tidak lagi hardcoded
- Admin dapat membuat campaign baru tanpa deploy aplikasi
- Admin dapat membuat trigger baru tanpa perubahan besar pada sistem
- Admin dapat mengirim manual notification kapan saja
- Mood, Quest, Mini Game, Event dan fitur lain menggunakan mekanisme yang sama
- Pengelolaan reminder menjadi terpusat

---

# 19. Final Vision

Notification Center bukan hanya sistem reminder.

Notification Center harus menjadi pusat komunikasi utama antara aplikasi dan pengguna.

Semua interaksi seperti:

- Mood Reminder
- Quest Reminder
- Mini Game Reminder
- Event Countdown
- Letter Unlock
- Reward Notification
- Anniversary Reminder

harus dapat dikelola melalui satu sistem yang konsisten, fleksibel, dan sepenuhnya dikendalikan oleh administrator tanpa perlu melakukan perubahan kode.
