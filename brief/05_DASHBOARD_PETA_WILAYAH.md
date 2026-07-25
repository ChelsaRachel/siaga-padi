# Modul Dashboard dan Peta Wilayah

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-010 (Dashboard dan Map untuk Penyuluh). Prioritas Should (MVP Extended); peta boleh disederhanakan. Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Dashboard operasional untuk penyuluh: berapa kasus baru, berapa menunggu review, tindak lanjut mana yang lewat tenggat, dan di area mana kasus mengelompok. Ini alat **prioritas kerja harian** — secara eksplisit bukan angka prevalensi resmi dan bukan surveilans epidemiologis. Peta hanya menampilkan agregat area; titik persis lokasi petani tidak ditampilkan ke role yang tidak membutuhkan, dan area dengan sampel kecil disamarkan.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Prioritas kerja harian | Penyuluh langsung tahu kasus mana yang paling butuh perhatian hari ini |
| Kesadaran sebaran awal | Pengelompokan kasus per area sebagai sinyal awal — dengan disclaimer bukan surveilans resmi |
| Privasi lokasi | Hanya agregat area; sampel kecil disamarkan; tanpa titik persis bagi role tak berkepentingan |
| Ekspor terbatas | Unduhan tabel wilayah binaan tanpa data pribadi yang tidak perlu |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Penyuluh | KPI wilayah binaan, antrean prioritas, peta sebaran agregat |
| Admin / Domain Reviewer | Pantauan lintas wilayah sesuai assignment |

---

## 2. Fitur Utama

### 2.1 Baris KPI

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu "Kasus Baru" | Kartu ringkasan | Jumlah kasus baru wilayah binaan | Per jam / manual refresh |
| Kartu "Perlu Review" | Kartu ringkasan | Backlog review | Per jam |
| Kartu "Tindak Lanjut Lewat Tenggat" | Kartu ringkasan + penanda peringatan | Follow-up overdue | Per jam |
| Kartu "Tingkat Tidak Yakin" | Kartu ringkasan | Proporsi kasus abstain | Per jam |
| Penanda kesegaran data | Teks kecil "Diperbarui 10 menit lalu" | Waktu refresh terakhir; menandai data basi | Real-time |

**Interaksi**: klik kartu → daftar kasus terfilter sesuai kategori kartu.

### 2.2 Daftar Kasus Prioritas

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Tabel/kartu kasus | Tabel daftar dengan filter | Kasus terurut prioritas keselamatan (bukan sekadar keyakinan) | Per menit |
| Bilah filter | Filter | Status, alasan review, area, rentang waktu | Manual |
| Tombol ekspor | Tombol aksi | Unduhan tabel terbatas wilayah binaan | On-demand |

**Interaksi**: klik baris → detail review (Modul 04); ekspor menghasilkan berkas tabel tanpa data pribadi yang tidak perlu, tautan berlaku singkat.

### 2.3 Peta Sebaran Agregat

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Peta lokasi interaktif | Peta dengan penanda agregat per area | Jumlah kasus per kecamatan, warna intensitas + label angka | Per jam |
| Keterangan peta | Legenda + disclaimer | "Sebaran operasional — bukan data prevalensi resmi" | Statis |
| Status peta terbatas | Panel pengganti | Muncul bila layanan peta tak tersedia — daftar area tetap tampil | Kondisional |

**Interaksi**: klik area → daftar kasus area itu; area bersampel kecil ditampilkan sebagai rentang/disamarkan, tidak pernah menunjuk lahan spesifik.

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Menu utama penyuluh | "Dashboard" | Baris KPI (2.1) | Assignment wilayah |
| Kartu KPI | Klik kartu | Daftar Kasus (2.2) terfilter | Kategori kartu |
| Daftar kasus | Klik baris | Modul `04_REVIEW_PENYULUH` — Detail Review | ID kasus |
| Peta | Klik area | Daftar Kasus (2.2) terfilter area | Kode area |
| Daftar kasus | Tombol "Ekspor" | Modal konfirmasi → unduhan | Filter aktif |
| Dashboard kosong | "Buat Kasus Pendampingan" | Modul `01` — Wizard (mode assisted) | — |

### 3.2 Decision Branch

- **Layanan peta gagal dimuat** → beralih otomatis ke daftar area tabular + banner "peta tidak tersedia"; fungsi lain tidak terganggu
- **Tidak ada kasus** → empty state berisi ajakan dan tautan cara membuat kasus pendampingan

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `04`: selesai review → kembali ke daftar kasus dengan filter dipertahankan

---

## 4. Alur Bisnis

### 4.1 Alur Pemantauan Harian (Happy Path)

```
┌───────────────┐  ┌────────────────────┐  ┌──────────────────────┐
│ Penyuluh buka │─▶│ Scan baris KPI:    │─▶│ Klik "Perlu Review"  │
│ dashboard pagi│  │ baru / review /    │  │ → daftar terfilter,  │
└───────────────┘  │ overdue / unknown  │  │ urut prioritas       │
                   └────────────────────┘  └──────────┬───────────┘
                                                      ▼
                                          ┌──────────────────────┐
                                          │ Drill-down kasus →   │
                                          │ review (Modul 04) →  │
                                          │ kembali dengan filter│
                                          │ dipertahankan        │
                                          └──────────────────────┘
```

### 4.2 Alur Ekspor Terbatas

1. Penyuluh memfilter daftar sesuai kebutuhan laporan.
2. Klik "Ekspor" → modal menegaskan cakupan (wilayah binaan, tanpa data pribadi tak perlu).
3. Berkas tabel dibuat; tautan unduh kedaluwarsa dalam 24 jam.

### 4.3 Alur Edge Case — Peta Tidak Tersedia

```
┌──────────────┐   ┌─────────────────────┐   ┌────────────────────────────┐
│ Dashboard    │──▶│ Layanan peta gagal  │──▶│ Banner "peta tidak         │
│ dimuat       │   │ dimuat              │   │ tersedia" + daftar area    │
└──────────────┘   └─────────────────────┘   │ tabular menggantikan peta  │
                                             └────────────────────────────┘
```

**Penjelasan:** Peta tidak boleh menjadi blocker — KPI, daftar, dan review tetap berfungsi penuh.

---

## 5. Data yang Dikelola Modul

*Di-skip — modul agregator: seluruh angka dihitung dari data kasus (Modul 01–04); tidak ada entity bisnis baru. Hasil agregasi bersifat cache singkat (≤ 15 menit).*

## 6. Kebutuhan Data Eksternal

### 6.1 Sumber

| Sumber | Jenis | Frekuensi |
|--------|-------|-----------|
| Layanan peta dasar (basemap) | Latar peta wilayah | Saat peta dibuka |

### 6.2 Catatan

- Layanan peta pihak ketiga membutuhkan kunci akses terdaftar — dikelola sebagai rahasia sistem, tidak pernah tampil di sisi klien tanpa proteksi.
- Batas wilayah administratif memakai data batas standar yang tersedia publik.

## 7. Stack Agent Modul

*Di-skip — agregasi dihitung backend terjadwal; tidak ada agent.*

## 8. Konfigurasi Alert

### 8.1 Threshold Tampilan

| Kondisi | Threshold | Aksi |
|---------|-----------|------|
| Tindak lanjut mendekati tenggat | ≤ 1 hari sebelum tenggat | Penanda peringatan pada kartu & baris |
| Tindak lanjut lewat tenggat | Melewati tenggat | Naik ke atas daftar + kartu KPI menyala |
| Data dashboard basi | Refresh terakhir > 15 menit | Penanda "data lama" + tombol muat ulang |

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Muat dashboard | Cepat |
| Interaksi filter/sort | Cepat |
| Frekuensi data | KPI & peta per jam (cache ≤ 15 menit); daftar kasus per menit |
| Ketersediaan | Jam kerja diperpanjang; degradasi peta tidak boleh mengganggu fungsi lain |

---

## 10. Use Case Scenarios

### 10.1 Skenario Prioritas Pagi

**Aktor**: Penyuluh
**Goal**: Menentukan urutan kerja hari ini

```
1. Dashboard: 4 kasus baru, 6 perlu review, 2 tindak lanjut overdue.
2. Kartu overdue menyala; klik → dua kunjungan terlewat kemarin.
3. Penyuluh menjadwalkan ulang satu, menandai satu selesai.
4. Lanjut ke "Perlu Review" → menyelesaikan antrean lewat Modul 04.
5. Melihat peta: kecamatan tetangga mengelompok 5 kasus indikasi Hawar Daun —
   dicatat untuk koordinasi dengan penyuluh wilayah itu.
```

### 10.2 Skenario Edge Case — Wilayah Tanpa Kasus

**Aktor**: Penyuluh baru
**Goal**: Mulai memakai sistem walau belum ada kasus masuk

```
1. Dashboard kosong: "Belum ada kasus di wilayah Anda."
2. Empty state menampilkan langkah memulai: buat kasus pendampingan saat kunjungan.
3. Klik "Buat Kasus Pendampingan" → wizard Modul 01 mode assisted.
```

---

## 11. Referensi Implementasi

### 11.1 Jakarta Smart City Dashboard

**URL**: https://smartcity.jakarta.go.id

**Fitur yang Diadaptasi**:
- Baris KPI + peta agregat per wilayah + drill-down ke daftar operasional

### 11.2 UNDP Crisis Risk Dashboard

**Fitur yang Diadaptasi**:
- Agregat area dengan disclaimer keterbatasan data dan penanda kesegaran

---

*Dokumentasi Brief Siaga Padi — Modul: Dashboard dan Peta Wilayah | FR: FR-010 | Versi: 1.0.0*
