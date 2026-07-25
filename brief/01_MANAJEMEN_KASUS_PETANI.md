# Modul Manajemen Kasus Petani

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-002 (Profil Petani, Lahan, Consent, Case Creation) dan FR-009 (Case Result dan History untuk Petani). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Modul ini adalah pintu masuk dan pintu keluar petani di Siaga Padi. Di sini petani (atau penyuluh yang mendampingi) membuat "kasus" — satu pengamatan pada satu lahan pada satu waktu — lengkap dengan consent penggunaan data, lalu di sini pula petani membaca hasil pemeriksaan dalam bahasa sederhana dan melihat riwayat lahannya.

Prinsip kunci: konteks secukupnya (tidak mengumpulkan data berlebihan), lokasi presisi opsional, dan hasil selalu disampaikan tanpa kepastian absolut — indikasi awal, bukan diagnosis final.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Konteks kasus yang cukup | Setiap kasus terikat ke petani, lahan, fase tanaman, dan waktu observasi |
| Privasi sejak desain | Tidak wajib nomor identitas nasional; GPS presisi opt-in; area kecamatan/kabupaten cukup |
| Hasil menenangkan, bukan menakutkan | Bahasa sederhana, band keyakinan (tinggi/sedang/rendah), selalu ada disclaimer dan jalur eskalasi |
| Riwayat milik petani | Petani hanya melihat kasus miliknya sendiri (termasuk yang dibuatkan secara assisted) |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Petani | Membuat kasus cepat dari ponsel, memahami hasil dan tindakan awal, melihat riwayat lahan |
| Penyuluh | Membuat kasus atas nama petani (mode pendampingan), memantau status kasus binaan |

---

## 2. Fitur Utama

### 2.1 Wizard Pembuatan Kasus

**Deskripsi**: Alur pembuatan kasus maksimal 3 langkah dengan tombol besar, dioptimalkan untuk layar ponsel di lapangan.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Langkah 1 — pilih petani/lahan | Form pilihan + opsi "buat baru" | Daftar petani (mode assisted) / lahan sendiri | Manual |
| Pemberitahuan tujuan data | Panel informasi ringkas | Teks consent: untuk apa data dipakai | Statis |
| Langkah 2 — lokasi & fase | Form pilihan + banner "GPS opsional" | Mode lokasi (GPS / area manual / belum tahu), fase pertumbuhan | Manual |
| Langkah 3 — konfirmasi | Kartu ringkasan | Pemilik kasus, lahan, fase, status consent | Manual |
| Indikator progres | Penunjuk langkah (1/3 … 3/3) | Posisi wizard | Real-time |

**Interaksi**:
- Pilih lahan yang ada atau buat baru dengan nama bebas
- GPS ditolak → sistem otomatis menawarkan pemilihan area kecamatan/kabupaten manual
- "Belum tahu" untuk lahan → kasus tetap dibuat dengan area administratif minimal
- Konfirmasi akhir → kasus berstatus DRAF, langsung diarahkan ke Modul Pengambilan Foto

### 2.2 Profil Petani dan Lahan

**Deskripsi**: Data ringkas petani dan daftar lahan — sengaja minimal.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu profil | Kartu ringkasan | Nama panggilan, area domisili, status akun (mandiri/didampingi) | Manual refresh |
| Daftar lahan | Galeri kartu | Nama lahan, area, fase terakhir, jumlah kasus | Manual refresh |
| Status consent | Indikator ikon + teks | Consent lokasi & consent data riset | Manual |

**Interaksi**:
- Ubah profil sendiri; ajukan permintaan penghapusan data
- Tambah/ubah lahan; buka lahan untuk melihat riwayat kasusnya

### 2.3 Hasil Kasus (Tampilan Petani)

**Deskripsi**: Kartu hasil besar dengan ikon + teks, tanpa jargon teknis.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu indikasi awal | Kartu ringkasan besar | Indikasi bahasa awam + band keyakinan + disclaimer "bukan diagnosis final" | Saat hasil siap |
| Kartu "lakukan sekarang" | Daftar tindakan bernomor | Tindakan awal aman dari rekomendasi tervalidasi | Saat hasil siap |
| Kartu "pantau" & "hindari" | Daftar poin | Yang diamati beberapa hari ke depan; yang jangan dilakukan | Saat hasil siap |
| Status review penyuluh | Indikator ikon + teks | Menunggu review / direview / perlu foto ulang | Real-time saat dibuka |
| Tombol "Hubungi Penyuluh" | Tombol aksi utama | — | Statis |
| Waktu pembaruan terakhir | Teks kecil | Kapan hasil terakhir diperbarui | Setiap pembaruan |

**Interaksi**:
- Buka ringkasan sumber rujukan (tidak memenuhi layar utama)
- Minta review penyuluh; lihat pembaruan penyuluh
- Hasil masih diproses → tampil progres bertahap, bukan spinner tanpa batas

### 2.4 Riwayat Kasus

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Daftar riwayat | Galeri kartu dengan filter | Kasus per waktu / lahan / status | Manual refresh |
| Linimasa kasus | Linimasa kronologis | Dibuat → foto → hasil → review → selesai | Saat dibuka |

**Interaksi**:
- Filter berdasarkan lahan, rentang waktu, status
- Klik kartu kasus → linimasa lengkap

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Beranda petani | Tombol "Periksa Tanaman" | Wizard Pembuatan Kasus (2.1) | — |
| Wizard langkah 3 | Tombol "Lanjut Ambil Foto" | Modul `02_PENGAMBILAN_FOTO_KUALITAS` | ID kasus baru (DRAF) |
| Beranda petani | Kartu "Riwayat" | Riwayat Kasus (2.4) | Filter default: semua lahan |
| Riwayat Kasus | Klik kartu kasus | Hasil Kasus (2.3) / linimasa | ID kasus |
| Hasil Kasus | Tombol "Hubungi Penyuluh" | Modal kontak penyuluh wilayah | ID kasus + area |
| Hasil Kasus | Tautan "Lihat sumber" | Laci sumber rujukan (Modul 03) | Daftar rujukan hasil ini |
| Notifikasi "perlu foto ulang" | Klik notifikasi | Modul `02_PENGAMBILAN_FOTO_KUALITAS` | ID kasus + panduan reviewer |

### 3.2 Decision Branch

- **Mode lokasi**: GPS diizinkan → koordinat tersimpan (opt-in); ditolak → form area manual, kasus tetap lanjut
- **Buka hasil**: siap → kartu hasil; diproses → layar progres bertahap; mode terbatas → kartu hasil + badge "mode terbatas" (Modul 09)

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `04_REVIEW_PENYULUH`: review selesai → notifikasi petani → Hasil Kasus (2.3) versi terbaru
- Dari Modul `08_ADMINISTRASI_SISTEM`: mode pendampingan aktif → penyuluh masuk Wizard (2.1) atas nama petani

---

## 4. Alur Bisnis

### 4.1 Alur Pembuatan Kasus (Happy Path)

```
┌────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Petani buka    │──▶│ Wizard 3 langkah:    │──▶│ Validasi field       │
│ "Periksa       │   │ petani/lahan →       │   │ minimum, buat ID     │
│ Tanaman"       │   │ lokasi & fase →      │   │ kasus + kunci        │
└────────────────┘   │ konfirmasi + consent │   │ anti-duplikat        │
                     └──────────────────────┘   └──────────┬───────────┘
                                                           ▼
                                                ┌──────────────────────┐
                                                │ Kasus DRAF → lanjut  │
                                                │ capture (Modul 02)   │
                                                └──────────────────────┘
```

**Penjelasan:** Satu kasus = satu waktu observasi + satu lahan. Jejak audit dibuat sejak kasus lahir.

### 4.2 Alur Membaca Hasil dan Riwayat

1. Petani menerima notifikasi hasil siap, membuka kasus.
2. Sistem memverifikasi kepemilikan kasus.
3. Kartu hasil tampil: indikasi + keyakinan + tindakan + pantau + hindari + status review.
4. Petani membuka riwayat, memfilter per lahan, membandingkan dengan kasus lama.

### 4.3 Alur Edge Case — GPS Ditolak / Lahan Belum Diketahui

```
┌──────────────┐   ┌───────────────────┐  diizinkan  ┌────────────────────────┐
│ Langkah      │──▶│ Izin GPS diminta? ├────────────▶│ Koordinat tersimpan    │
│ lokasi       │   └─────────┬─────────┘             │ (opt-in; dibulatkan    │
└──────────────┘             │ ditolak               │ pada tampilan agregat) │
                             ▼                       └────────────────────────┘
                  ┌────────────────────────┐
                  │ Form area manual:      │
                  │ kabupaten → kecamatan  │
                  └──────────┬─────────────┘
                             │ lahan tidak diketahui
                             ▼
                  ┌────────────────────────┐
                  │ "Belum tahu" → area    │
                  │ administratif minimal, │
                  │ kasus tetap lanjut     │
                  └────────────────────────┘
```

**Penjelasan:** Penolakan GPS tidak pernah memblokir pembuatan kasus; presisi diturunkan dengan anggun.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Kasus**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| ID Kasus | Identitas unik kasus | KS-2026-000123 |
| Pemilik | Petani subjek kasus | Pak Karto |
| Dibuat oleh | Pembuat kasus (bisa penyuluh saat assisted) | Bu Sari (Penyuluh) |
| Lahan | Lahan yang diamati | Sawah Blok Timur |
| Fase tanaman | Fase pertumbuhan saat observasi | Anakan / bunting / pengisian bulir |
| Mode lokasi | Presisi / area manual / belum tahu | Area manual — Kec. Cilamaya |
| Status | Posisi kasus di alur | DRAF → difoto → diproses → hasil siap → direview → selesai |
| Waktu observasi | Kapan pengamatan dilakukan | 25 Jul 2026 08:40 |

**Petani**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Nama panggilan | Tanpa kewajiban identitas nasional | Pak Karto |
| Area domisili | Kabupaten/kecamatan | Karawang / Cilamaya |
| Status akun | Mandiri atau hanya didampingi | Didampingi (belum aktivasi) |
| Consent | Izin lokasi presisi & penggunaan data riset | Lokasi: tidak; Riset: ya |

**Lahan**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Nama lahan | Penamaan bebas oleh petani | Sawah Blok Timur |
| Area administratif | Kecamatan/kabupaten | Cilamaya, Karawang |
| Koordinat | Opsional, hanya jika opt-in | (kosong) |

### 5.2 Sample Data

| ID Kasus | Pemilik | Lahan | Fase | Status | Waktu |
|---|---|---|---|---|---|
| KS-2026-000123 | Pak Karto | Sawah Blok Timur | Anakan | Hasil siap | 25 Jul 08:40 |
| KS-2026-000119 | Bu Inah | Sawah Pinggir Kali | Bunting | Direview | 24 Jul 15:12 |
| KS-2026-000101 | Pak Karto | Sawah Blok Timur | Anakan | Selesai | 18 Jul 07:05 |

### 5.3 Catatan untuk Tim Downstream

- Status kasus mengikuti state machine ketat FRD §6.5–6.6; tidak boleh lompat status; setiap transisi tercatat untuk audit.
- Pembuatan kasus memakai kunci anti-duplikat: kiriman ulang dengan kunci sama tidak boleh membuat kasus ganda.
- Petani berhak meminta penghapusan data sesuai kebijakan retensi.
- Profil buatan penyuluh tanpa akun petani ditandai "hanya didampingi" sampai petani aktivasi sendiri.

---

## 6. Kebutuhan Data Eksternal

*Di-skip — modul ini hanya memakai data internal dan daftar wilayah administratif standar yang dikelola internal.*

## 7. Stack Agent Modul

*Di-skip — modul pencatatan dan penyajian; pemrosesan otomatis dijelaskan sebagai pipeline sistem di Modul 03 dan 09.*

## 8. Konfigurasi Alert

*Di-skip — notifikasi status kasus adalah bagian alur normal, bukan alerting berbasis threshold.*

---

## 9. Standar Layanan yang Diharapkan

### 9.1 Kecepatan Tampil Data

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Wizard pembuatan kasus | Cepat — petani di lapangan, sinyal terbatas |
| Tampil hasil kasus | Cepat |
| Riwayat & linimasa | Sedang |

### 9.2 Frekuensi Pembaruan Data

| Jenis Data | Frekuensi |
|-----------|-----------|
| Status kasus di layar hasil | Real-time saat dibuka |
| Riwayat kasus | Manual refresh |

### 9.3 Ketersediaan Layanan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Jam operasional | 24-7 — petani memeriksa tanaman pagi-pagi |
| Toleransi downtime | Rendah pada jam pagi (jam pengamatan lapangan) |
| Konteks bisnis | Pembuatan kasus harus tetap bisa dimulai saat jaringan buruk (lihat Modul 09) |

---

## 10. Use Case Scenarios

### 10.1 Skenario Pemeriksaan Pagi oleh Petani

**Aktor**: Petani
**Goal**: Mencatat gejala mencurigakan dan tahu tindakan awal

```
1. Pagi hari, petani melihat bercak daun. Buka Siaga Padi, ketuk "Periksa Tanaman".
2. Wizard: pilih lahan "Sawah Blok Timur", fase "Anakan".
3. Izin GPS ditolak; sistem menawarkan pilihan area — petani pilih kecamatannya.
4. Konfirmasi → kasus DRAF dibuat, layar pengambilan foto terbuka (lanjut Modul 02–03).
5. Satu jam kemudian notifikasi hasil masuk. Kartu hasil: indikasi awal + tindakan aman
   "lakukan sekarang" + catatan "menunggu review penyuluh".
6. Petani mengikuti tindakan pantau dan menunggu konfirmasi penyuluh.
```

### 10.2 Skenario Edge Case — Hasil Masih Diproses Saat Dibuka

**Aktor**: Petani
**Goal**: Tahu posisi kasusnya walau hasil belum siap

```
1. Petani membuka kasus 5 menit setelah upload foto.
2. Sistem menampilkan progres bertahap: "Foto diterima ✓ → Analisis gambar (berjalan) →
   Pertanyaan lanjutan → Rekomendasi" — bukan spinner tanpa keterangan.
3. Petani menutup aplikasi; notifikasi masuk saat tahap berikutnya siap.
4. Kasus tidak hilang; status tersimpan dan bisa dilanjutkan kapan saja.
```

### 10.3 Skenario Pendampingan oleh Penyuluh

**Aktor**: Penyuluh
**Goal**: Membuatkan kasus untuk petani tanpa ponsel pintar

```
1. Penyuluh mengaktifkan mode pendampingan (Modul 08), mencari petani binaan.
2. Akun belum ada → penyuluh membuat profil minimal + mencatat metode consent lisan.
3. Wizard berjalan sama; sistem mencatat "dibuat oleh penyuluh atas nama petani".
4. Hasil tetap milik petani; penyuluh menyampaikan hasil saat kunjungan.
```

---

## 11. Referensi Implementasi

### 11.1 Rice Doctor (IRRI)

**URL**: https://www.knowledgebank.irri.org

**Fitur yang Diadaptasi**:
- Identifikasi masalah padi bertahap dengan bahasa sederhana
- Pemisahan "indikasi" dari "kepastian diagnosis"

### 11.2 Plantix

**URL**: https://plantix.net

**Fitur yang Diadaptasi**:
- Pola kasus-per-foto dengan riwayat per lahan
- Kartu hasil dengan tindakan langsung + pencegahan terpisah

---

*Dokumentasi Brief Siaga Padi — Modul: Manajemen Kasus Petani | FR: FR-002, FR-009 | Versi: 1.0.0*
