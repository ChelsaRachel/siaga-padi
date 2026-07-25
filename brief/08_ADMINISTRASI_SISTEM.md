# Modul Administrasi Sistem

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-001 (Authentication, Role, dan Assisted Usage) dan FR-013 (Admin Model, Provider, dan Threshold Configuration). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Dua fondasi operasional dalam satu modul: (1) **identitas dan akses** — login, empat role (Petani, Penyuluh, Admin, Domain Reviewer), pembatasan wilayah binaan, dan mode pendampingan yang selalu mencatat "siapa bertindak atas nama siapa dengan consent apa"; (2) **konfigurasi terkendali** — versi model, penyedia layanan AI, ambang batas, dan versi basis pengetahuan diubah lewat alur draf → tinjau → aktif → bisa di-rollback, dengan perubahan kritis wajib persetujuan orang kedua.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Akses sesuai peran | Petani hanya kasus sendiri; penyuluh hanya wilayah binaan; admin tak mengubah label ahli tanpa audit |
| Pendampingan berjejak | Mode assisted mencatat pelaku, subjek, metode consent, dan waktu |
| Konfigurasi aman & tertelusur | Satu versi aktif per lingkup; perubahan kritis butuh orang kedua; rollback selalu tersedia |
| Rahasia tidak bocor | Kunci layanan hanya di penyimpanan rahasia sistem — tidak pernah di tampilan atau basis data terbuka |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Semua role | Login sederhana, sesi aman, beranda sesuai peran |
| Penyuluh | Mode pendampingan untuk petani binaan |
| Admin (Fahri/Chelsa peninjau) | Kelola pengguna/role, konfigurasi model-penyedia-ambang, pantau kesehatan & biaya |

---

## 2. Fitur Utama

### 2.1 Login dan Beranda per Peran

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Halaman login sederhana | Form | Kredensial akun (tanpa akun bersama) | Manual |
| Beranda sesuai peran | Halaman awal berbeda per role | Nama, role, wilayah binaan (penyuluh) | Saat login |
| Notifikasi sesi berakhir | Modal | Draf lokal non-sensitif tersimpan; ajakan login ulang | Kondisional |

**Interaksi**: gagal login 5 kali dalam 15 menit → akun terkunci sementara; sesi berakhir → draf tidak hilang, lanjut setelah login ulang.

### 2.2 Mode Pendampingan (Assisted)

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Modal mode pendampingan | Modal pencarian + consent | Cari petani dalam binaan; pilih metode consent | Manual |
| Banner "atas nama" | Indikator tetap di atas layar | "Anda bertindak atas nama: Pak Karto" | Selama mode aktif |

**Interaksi**: penyuluh mencari petani (hanya lingkup binaan); petani belum punya akun → buat profil minimal + consent; setiap aksi tercatat pelaku + subjek + consent + waktu.

### 2.3 Manajemen Pengguna dan Role

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Daftar pengguna | Tabel dengan filter | Akun, role, wilayah/assignment, status | Manual |
| Form assignment | Form | Penugasan wilayah/kelompok penyuluh & reviewer | Manual |

### 2.4 Katalog Konfigurasi

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Katalog konfigurasi | Tabel daftar | Versi, status, pemilik, lingkup (model / penyedia / ambang / KB / keamanan) | Manual |
| Nilai tersamar | Tampilan detail | Nilai non-rahasia; rahasia selalu tersamar | Saat dibuka |
| Tampilan banding (diff) | Panel perbandingan | Perubahan draf vs aktif | Saat dibuka |
| Tombol Setujui / Aktifkan / Rollback | Bilah aksi | — | Manual |
| Panel kesehatan & biaya penyedia | Kartu ringkasan + indikator status | Status tiap penyedia AI, pemakaian vs pagu belanja bulanan | Per jam |

**Interaksi**: buat draf → pemeriksaan otomatis → perubahan kritis (model CV, ambang, KB, aturan keamanan, mode privasi penyedia) wajib persetujuan orang kedua → aktivasi bertahap → pantau → rollback bila error naik.

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Semua modul | Buka aplikasi tanpa sesi | Halaman Login (2.1) | Halaman tujuan setelah login |
| Login sukses | Otomatis | Beranda sesuai peran | Role + assignment |
| Beranda penyuluh | "Dampingi Petani" | Modal Mode Pendampingan (2.2) | Lingkup binaan |
| Mode pendampingan aktif | "Buat Kasus" | Modul `01` — Wizard atas nama petani | Subjek + consent |
| Menu admin | "Konfigurasi" | Katalog Konfigurasi (2.4) | — |
| Baris konfigurasi | "Lihat diff" | Tampilan banding | Versi draf + aktif |
| Panel kesehatan penyedia | Klik penyedia | Detail kesehatan/biaya | Nama penyedia |

### 3.2 Decision Branch

- **Aktivasi konfigurasi**: kritis → wajib orang kedua; non-kritis → cukup satu admin
- **Kesehatan penyedia memburuk** → rute otomatis nonaktif → rantai cadangan (Modul 09); pulih → rute kembali
- **Rollback darurat** → admin berwenang boleh langsung rollback; tinjauan pasca-kejadian wajib

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `06`: aktivasi versi KB dieksekusi lewat alur persetujuan modul ini
- Dari Modul `02`/`03`: ambang kualitas/keyakinan yang berlaku berasal dari versi konfigurasi aktif; setiap kasus mencatat versi yang dipakainya

---

## 4. Alur Bisnis

### 4.1 Alur Perubahan Konfigurasi Kritis (Happy Path)

```
┌────────────┐  ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐
│ Admin buat │─▶│ Pemeriksaan   │─▶│ Peninjau kedua │─▶│ Aktivasi bertahap  │
│ draf config│  │ otomatis      │  │ menyetujui     │  │ + pantau kesehatan │
└────────────┘  │ kecocokan     │  │ (wajib untuk   │  └─────────┬──────────┘
                └───────────────┘  │ perubahan      │            ▼
                                   │ kritis)        │  ┌────────────────────┐
                                   └────────────────┘  │ Error naik? →      │
                                                       │ rollback ke versi  │
                                                       │ sebelumnya         │
                                                       └────────────────────┘
```

**Penjelasan:** Hanya satu versi aktif per lingkup. Audit menyimpan diff setiap perubahan; setiap kasus menyimpan versi konfigurasi yang dipakai.

### 4.2 Alur Mode Pendampingan

1. Penyuluh membuka "Dampingi Petani", mencari nama dalam binaan.
2. Petani ada → pilih + catat metode consent; belum ada → buat profil minimal ("hanya didampingi").
3. Banner "atas nama" aktif; semua aksi tercatat pelaku + subjek.
4. Selesai → keluar mode; jejak audit lengkap.

### 4.3 Alur Edge Case — Percobaan Login Berulang Gagal

```
┌──────────────┐   ┌──────────────────────┐   ┌───────────────────────────┐
│ Login gagal  │──▶│ 5 kegagalan dalam    │──▶│ Akun terkunci sementara + │
│ berulang     │   │ 15 menit             │   │ pesan jelas kapan bisa    │
└──────────────┘   └──────────────────────┘   │ coba lagi + jejak audit   │
                                              └───────────────────────────┘
```

**Penjelasan:** Kunci sementara melindungi akun; pesan tidak membocorkan apakah nama akun terdaftar.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Akun Pengguna**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Akun & role | Identitas login + peran | bu.sari — Penyuluh |
| Assignment | Wilayah/kelompok binaan (penyuluh/reviewer) | Kec. Cilamaya |
| Status | Aktif / terkunci sementara / nonaktif | Aktif |

**Catatan Pendampingan**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Pelaku & subjek | Siapa bertindak atas nama siapa | Bu Sari → Pak Karto |
| Metode consent | Lisan / tertulis / dalam aplikasi | Lisan (dicatat) |
| Waktu | Kapan sesi pendampingan | 25 Jul 09:15 |

**Versi Konfigurasi**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Lingkup | Model / penyedia / ambang / KB / keamanan | Ambang keyakinan |
| Versi & status | Draf / ditinjau / aktif / diarsip | v7 — aktif |
| Peninjau | Orang kedua untuk perubahan kritis | Chelsa |
| Pagu belanja | Batas bulanan penyedia berbayar | (nilai pagu) |

### 5.2 Sample Data

| Lingkup | Versi | Status | Peninjau |
|---|---|---|---|
| Ambang keyakinan CV | v7 | Aktif | Chelsa |
| Penyedia AI bahasa | v4 | Aktif (cadangan siaga) | Fahri |
| Versi KB | 2024-v2 | Aktif | Domain reviewer |

### 5.3 Catatan untuk Tim Downstream

- Kunci layanan hanya lewat penyimpanan rahasia lingkungan — tidak pernah di basis data terbuka atau balasan tampilan.
- Kata sandi tidak pernah tersimpan terbuka; token sesi tidak pernah muncul di alamat halaman.
- Model usang tidak boleh terpilih setelah tanggal penghentian.
- Tidak ada akun bersama pada pilot.

---

## 6. Kebutuhan Data Eksternal

*Di-skip — konfigurasi dan identitas dikelola internal; kesehatan penyedia AI dipantau lewat pemeriksaan layanan, bukan konsumsi data.*

## 7. Stack Agent Modul

*Di-skip — modul kendali manusia; pemeriksaan kesehatan penyedia adalah pekerjaan terjadwal sistem.*

## 8. Konfigurasi Alert

### 8.1 Threshold

| Kondisi | Threshold | Aksi |
|---------|-----------|------|
| Penyedia AI sehat | Pemeriksaan normal | Indikator hijau |
| Penyedia melambat/gagal sebagian | Kegagalan melewati ambang toleransi | Indikator kuning + rute cadangan siaga |
| Penyedia gagal | Pemeriksaan gagal beruntun | Indikator merah + rute nonaktif otomatis + fallback aktif |
| Belanja mendekati pagu | ≥ 80% pagu bulanan | Peringatan di panel biaya |
| Belanja mencapai pagu | 100% pagu | Penyedia berbayar dihentikan; jalur gratis/fallback dipakai |

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Login & muat beranda | Cepat |
| Panel admin | Sedang |
| Frekuensi kesehatan penyedia | Per jam (lebih sering saat insiden) |
| Ketersediaan | Login 24-7; panel admin jam kerja diperpanjang |

---

## 10. Use Case Scenarios

### 10.1 Skenario Ganti Ambang Keyakinan

**Aktor**: Admin + peninjau kedua
**Goal**: Menaikkan ambang wajib-review tanpa risiko

```
1. Admin membuat draf ambang v8 (menaikkan batas wajib review).
2. Pemeriksaan otomatis lolos; diff menunjukkan perubahan tunggal.
3. Chelsa (peninjau kedua) menyetujui — perubahan kritis.
4. Aktivasi bertahap; panel kesehatan dipantau 24 jam.
5. Proporsi kasus wajib-review naik sesuai perkiraan → versi dipertahankan.
   (Jika anomali: satu klik rollback ke v7.)
```

### 10.2 Skenario Edge Case — Penyedia AI Utama Tumbang

**Aktor**: Sistem + Admin
**Goal**: Layanan rekomendasi tetap hidup tanpa intervensi panik

```
1. Pemeriksaan kesehatan mendeteksi penyedia utama gagal beruntun.
2. Rute otomatis nonaktif; rantai cadangan mengambil alih (Modul 09).
3. Panel admin menampilkan indikator merah + waktu kejadian.
4. Admin memantau; saat penyedia pulih, rute kembali otomatis.
5. Tinjauan pasca-kejadian dicatat.
```

---

## 11. Referensi Implementasi

### 11.1 Pola feature-flag & aktivasi bertahap (praktik rilis modern)

**Fitur yang Diadaptasi**:
- Draf → tinjau → aktivasi bertahap → rollback satu-klik dengan audit diff

### 11.2 Pola konsol penyedia cloud (kesehatan + pagu biaya)

**Fitur yang Diadaptasi**:
- Panel kesehatan per layanan dan peringatan pagu belanja bulanan

---

*Dokumentasi Brief Siaga Padi — Modul: Administrasi Sistem | FR: FR-001, FR-013 | Versi: 1.0.0*
