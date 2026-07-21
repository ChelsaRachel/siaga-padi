# DESIGN — Web / Fusion · "Tani Ramah"

Design authority for the Siaga Padi web PWA. Resolved from `design/design-system.md`
(`web → fusion`). Live tokens: `apps/web/src/styles/variable.css`.

## Konsep

**Sederhana, natural, ramah petani, berbasis kartu.**

Pengguna utama adalah **petani** dengan literasi digital beragam, memakai HP
**di lapangan, sering di bawah sinar matahari langsung**. Konsekuensinya kontras
bukan sekadar estetika — setiap pasangan warna/teks wajib lolos **WCAG AA (4.5:1)**.
Pengguna kedua adalah **penyuluh** yang memantau lewat dashboard dan peta.

---

## Warna

Semua rasio di bawah hasil perhitungan, bukan perkiraan.

### Primary — hijau sawah (aksi utama, header, state aktif)

| Step | Light | Dark |
|------|---------|---------|
| 50 | `#EDF5F0` | `#0C2E1E` |
| 300 | `#74B195` | `#1A5C3E` |
| **500** | **`#1F6F4A`** | **`#2E7F5C`** |
| 700 | `#154A32` | `#74B195` |
| 900 | `#0C2E1E` | `#EDF5F0` |

Teks putih di atas `primary-500`: **6.12:1** (light) · **4.88:1** (dark) — AA PASS.

### Secondary — kuning padi (**aksen saja**)

`500` = `#E8B931` (light) · `#A17B1B` (dark).

> ⚠️ **Jangan pakai kuning sebagai permukaan tombol dengan teks putih** — gagal
> kontras (1.84:1). Kuning padi hanya untuk **highlight, badge, indikator panen,
> dan garis aksen**, selalu dipasangkan dengan **teks gelap** (`#080C14` → 10.64:1).

### Tertiary — tanah hangat (kategori, ilustrasi, permukaan sekunder)

`500` = `#7A5A3C`. Teks putih: **6.26:1** (light & dark) — AA PASS.

### Danger — peringatan hama/penyakit

Gunakan `--base-error-*`. Peringatan tingkat berat harus lolos AA dan **tidak boleh
mengandalkan warna saja** — selalu sertakan ikon + label teks (banyak petani pria
Indonesia mengalami buta warna merah-hijau; hijau/merah saja tidak cukup).

---

## Bentuk & kedalaman

- **Sudut melengkung besar** — base `12px`, kartu `16px`, kartu fitur `20px`,
  permukaan kamera/hero `24px`, bottom sheet `32px`. Tidak boleh kotak/kaku.
- **Shadow tipis** — `shadow-lg` maksimum untuk kartu. Kedalaman hanya sebagai
  petunjuk lapisan, bukan drama visual.
- **Ikonografi ilustratif**, bukan ikon garis teknis. Ikon berdampingan dengan
  label teks — jangan ikon tanpa teks untuk aksi penting.

---

## Aturan UX (mengikat)

1. **Alur linier terpandu.** Satu layar = satu keputusan. Alur inti
   (foto → triage → rekomendasi) harus berupa langkah berurutan dengan progres
   yang terlihat, bukan form panjang.
2. **Kepadatan informasi rendah.** Jangan menumpuk tabel/metrik di layar petani.
   Ringkasan dulu, detail di balik ketukan. Dashboard padat khusus penyuluh.
3. **Bottom Navigation Bar di mobile** — navigasi utama harus terjangkau satu
   tangan. Sidebar hanya untuk layar lebar/penyuluh.
4. **Target sentuh ≥ 44×44px** — dipakai sambil berdiri di sawah, sering dengan
   tangan kotor/basah.
5. **Bahasa Indonesia sederhana.** Hindari istilah teknis dan jargon agronomi
   tanpa penjelasan.
6. **Offline harus jujur.** Saat draft mengantre (FR-014), tampilkan status
   antrean secara eksplisit — jangan pura-pura sudah terkirim.

---

## Sumber token

Jangan hardcode warna. Selalu lewat token:

```css
--base-{primary|secondary|tertiary}-{50..900}   /* palet mentah */
--primary-base, --bg-primary, --text-color-primary, --text-color-on-accent
--radius-{sm|md|lg|xl|2xl|3xl}
--shadow-{sm|md|lg|xl}
```

Light dan dark keduanya wajib didukung — token sudah menanganinya; jangan
menulis warna kondisional di komponen.

> `apps/web/globals.css` **tidak di-bundle** (tidak di-import di mana pun; hanya
> pointer untuk CLI shadcn). Sumber yang hidup adalah
> `apps/web/src/styles/variable.css` via `src/index.css`.
