# Refactor Admin Dashboard - Struktur Baru

## 📁 Struktur Folder

```
app/
├── admin/
│   └── page.tsx          ✨ Refactored - Clean & lean (150+ lines)
└── hooks/
    └── useAdminData.ts   🪝 Data fetching hook

components/
└── common/               🧩 Generic, reusable components
    ├── StatCard.tsx      # Bisa dipakai di project lain
    ├── CalendarGrid.tsx  # Fully customizable via props
    ├── NotesList.tsx     # Expand/collapse notes
    ├── HistoryList.tsx   # List dengan pagination support
    └── index.ts          # Re-export semua

lib/
├── mood-types.ts         📋 Tipe data & konstanta (reusable)
├── calendar-utils.ts     🔧 Utility functions
└── admin-theme.ts        🎨 Admin-specific styling & colors
```

## 🎯 Filosofi Desain

### Generic Components (`components/common/`)

- **Pure struktur** - Tidak ada styling internal yang "keras"
- **Styling via props** - Semua styling diterima dari props
- **Data agnostic** - Bisa terima berbagai format data
- **Reusable** - Copy-paste ke project lain tanpa dependency

**Contoh:**

```tsx
<CalendarGrid
  days={calendarData}
  getEmoji={(r) => emojiMap[r]}
  cellStyle={(r) => ({ background: colorMap[r] })}
/>
```

### Admin-Specific (`lib/admin-theme.ts`)

- **Styling functions** - `getRatingColor()`, `getRatingBg()`
- **Theme constants** - `ADMIN_STYLES`, `LEGEND_DATA`
- **Warna & konstanta** - Definisi visual admin project

**Jika mau styling berbeda?**

```tsx
// Project lain bisa bikin file sendiri
// contoh: lib/project-theme.ts
export function getRatingColor(r: number) {
  // Custom color scheme
}
```

### Utils (`lib/`)

- **Tipeless, pure functions** - Hanya logic
- **No styling** - Hanya data transformation
- **Reusable di project apapun**

---

## 📚 Cara Menggunakan di Project Lain

### Step 1: Copy folder `components/common/`

Beri nama: `components/ui/` atau `components/shared/`

### Step 2: Copy `lib/mood-types.ts`

(Untuk tipe data yang sama)

### Step 3: Buat styling custom

```tsx
// components/my-theme.ts
export const MY_THEME = {
  card: {
    /* styling custom */
  },
  // ...
};

export function getMyRatingColor(r: number) {
  // Custom logic
}
```

### Step 4: Gunakan

```tsx
import { CalendarGrid, NotesList } from "@/components/ui";
import { getMyRatingColor } from "@/components/my-theme";

export function MyDashboard() {
  return (
    <CalendarGrid
      days={data}
      cellStyle={(r) => ({
        background: getMyRatingColor(r),
      })}
    />
  );
}
```

---

## ✨ Keuntungan Struktur Baru

| Aspek           | Sebelum                 | Sesudah                         |
| --------------- | ----------------------- | ------------------------------- |
| **Lines**       | 650+ dalam 1 file       | ~150 admin/page.tsx + modular   |
| **Reusability** | Tidak bisa              | ✅ Copy-paste ke project lain   |
| **Styling**     | Hardcoded, mixed        | Separated, customizable         |
| **Testing**     | Sulit                   | ✅ Setiap component bisa ditest |
| **Maintenance** | Complex                 | ✅ Setiap piece kecil & fokus   |
| **Performance** | Recalc di setiap render | ✅ Memoized                     |

---

## 🔍 Quick Reference

### Mana yang reusable?

- ✅ `components/common/*` - 100% reusable
- ✅ `lib/mood-types.ts` - Reusable type definitions
- ✅ `lib/calendar-utils.ts` - Pure utility functions
- ❌ `lib/admin-theme.ts` - Admin-specific only

### Mau customize styling?

Edit: `lib/admin-theme.ts`

- `getRatingColor()` - Warna berdasarkan rating
- `getRatingBg()` - Background color
- `ADMIN_STYLES` - Semua style objects
- `LEGEND_DATA` - Data legenda

### Mau tambah tab baru?

1. Buat component di `components/common/` (jika generic)
2. Import di `app/admin/page.tsx`
3. Add tab logic
4. Styling dari `lib/admin-theme.ts`

---

## 🚀 Next Steps

- [ ] Add unit tests untuk components
- [ ] Create CSS modules jika styling grow
- [ ] Add loading skeleton component
- [ ] Add error boundary
- [ ] Create Storybook untuk showcase components
