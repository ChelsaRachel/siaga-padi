# Modul Pengambilan Foto dan Kualitas

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-003 (Smartphone Photo Capture dan Upload) dan FR-004 (Image-Quality Validation dan Retake Guidance). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Modul ini memandu pengguna mengambil 2–3 foto daun yang layak dianalisis langsung dari peramban ponsel, lalu menyaringnya lewat gerbang kualitas otomatis. Foto buram, gelap, terlalu jauh, atau bukan daun ditolak dengan alasan sederhana dan tips perbaikan — bukan skor teknis mentah. Tujuannya satu: sistem tidak pernah menganalisis foto yang tidak layak, karena hasil menyesatkan lebih berbahaya daripada tidak ada hasil.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Bukti visual konsisten | Panduan bingkai + contoh foto baik/buruk agar kualitas input seragam |
| Privasi foto | Data lokasi tertanam di foto dihapus sebelum disimpan; wajah tidak boleh ada (crop/blur/retake) |
| Cegah analisis foto buruk | Gerbang kualitas menolak foto tak layak dengan maksimal 3 alasan utama + tips |
| Jalan keluar manusiawi | Setelah 3 kali gagal retake, pengguna boleh kirim ke review manusia tanpa auto-diagnosis |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Petani | Dipandu memotret dengan benar tanpa istilah teknis |
| Penyuluh | Memotret cepat saat mendampingi banyak petani di lapangan |

---

## 2. Fitur Utama

### 2.1 Kamera Terpandu

**Deskripsi**: Tampilan kamera penuh-layar dengan bingkai panduan agar daun memenuhi area foto.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Contoh foto baik/buruk | Galeri kartu perbandingan | Ilustrasi sebelum mulai memotret | Statis |
| Kamera penuh-layar | Tampilan kamera langsung | — | Real-time |
| Bingkai panduan (overlay) | Garis bantu di atas kamera | Area yang harus dipenuhi daun | Real-time |
| Penghitung foto | Indikator "Foto 1 dari 2 (maks 3)" | Minimum 2, maksimum 3 | Real-time |
| Tips cahaya/fokus | Teks bantuan singkat | Saran pencahayaan dan jarak | Statis |

**Interaksi**:
- Aktifkan kamera; kamera tidak tersedia → unggah dari galeri dengan panduan sama
- Setelah jepret: pratinjau dengan tombol "Foto Ulang" / "Pakai Foto Ini"
- Catatan privasi tampil: data lokasi pada foto dihapus otomatis

### 2.2 Unggah dengan Progres

**Deskripsi**: Pengiriman foto dengan indikator kemajuan, coba-ulang otomatis, dan penyimpanan sementara saat jaringan putus.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Bilah progres unggah | Indikator kemajuan per foto | Persen terkirim | Real-time |
| Badge "menunggu jaringan" | Indikator status ikon + teks | Foto tersimpan lokal, menunggu koneksi | Real-time |
| Tombol coba lagi | Tombol aksi | — | Saat gagal |

**Interaksi**:
- Jaringan putus → foto tersimpan sementara di perangkat, terkirim otomatis saat koneksi kembali (Modul 09)
- Foto duplikat terdeteksi otomatis, tidak dikirim dua kali

### 2.3 Kartu Hasil Kualitas dan Panduan Foto Ulang

**Deskripsi**: Hasil pemeriksaan kualitas per foto dengan alasan sederhana dan tips spesifik.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu hasil kualitas | Kartu status per foto | Layak / tidak layak + maks 3 alasan (buram, gelap, terlalu jauh, bukan daun) | Setelah pemeriksaan |
| Tips foto ulang | Panel saran + contoh sebelum/sesudah | Cara memperbaiki sesuai alasan penolakan | Setelah penolakan |
| Tombol "Kirim ke Penyuluh Saja" | Tombol aksi sekunder | Muncul setelah 3 kali gagal | Kondisional |

**Interaksi**:
- Foto ditolak → langsung ke kamera dengan tips relevan
- Satu foto gagal tidak menggagalkan kasus selama jumlah foto layak minimum terpenuhi
- 3 kali retake gagal → opsi kirim sebagai "perlu review manusia" tanpa analisis otomatis

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Wizard kasus (Modul 01) | "Lanjut Ambil Foto" | Layar contoh baik/buruk → kamera | ID kasus |
| Pratinjau foto | "Pakai Foto Ini" | Layar unggah dengan progres | Foto + nomor urut |
| Kartu hasil kualitas (ditolak) | "Foto Ulang" | Kamera dengan tips relevan | Alasan penolakan |
| Kartu hasil kualitas (3x gagal) | "Kirim ke Penyuluh Saja" | Konfirmasi → kasus perlu review | ID kasus + foto apa adanya |
| Semua foto layak | Otomatis | Modul `03_TRIASE_REKOMENDASI_AI` | ID kasus + foto layak |

### 3.2 Decision Branch

- **Kamera tidak tersedia** → tawarkan unggah galeri dengan panduan sama
- **Kualitas ambang batas (borderline)** → diterima dengan peringatan; keyakinan analisis hilir diberi penalti kualitas
- **Tidak bisa menilai apakah objek daun** → tandai "kualitas tidak pasti" → masuk review atau minta foto tambahan

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `04_REVIEW_PENYULUH`: reviewer minta foto tambahan → pengguna ke kamera dengan catatan panduan reviewer
- Dari Modul `01`: notifikasi "perlu foto ulang" → langsung ke kamera dengan konteks kasus

---

## 4. Alur Bisnis

### 4.1 Alur Foto Sampai Layak (Happy Path)

```
┌─────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐
│ Lihat contoh│─▶│ Jepret dengan│─▶│ Pratinjau →   │─▶│ Unggah + pemeriksaan│
│ baik/buruk  │  │ bingkai      │  │ "Pakai Foto"  │  │ kualitas otomatis   │
└─────────────┘  │ panduan      │  └───────────────┘  └─────────┬───────────┘
                 └──────────────┘                               ▼
                                                     ┌─────────────────────┐
                                                     │ 2 foto layak →      │
                                                     │ lanjut analisis     │
                                                     │ (Modul 03)          │
                                                     └─────────────────────┘
```

**Penjelasan:** Ukuran foto dinormalisasi dan data lokasi tertanam dihapus di perangkat sebelum terkirim.

### 4.2 Alur Penolakan dan Foto Ulang

1. Gerbang kualitas menilai: ketajaman, pencahayaan, resolusi, cakupan daun.
2. Foto gagal → kartu alasan sederhana (maks 3) + tips spesifik + contoh sebelum/sesudah.
3. Pengguna memotret ulang; penghitung retake bertambah.
4. Foto ditolak tetap tercatat untuk evaluasi pengalaman pengguna, tapi tidak dipakai melatih model.

### 4.3 Alur Edge Case — Jaringan Putus di Tengah Unggah

```
┌──────────────┐   ┌────────────────────┐   ┌─────────────────────────┐
│ Unggah foto  │──▶│ Koneksi terputus   │──▶│ Foto tersimpan lokal +  │
│ berjalan     │   └────────────────────┘   │ badge "menunggu         │
└──────────────┘                            │ jaringan" + jumlah      │
                                            │ tertunda                │
                                            └───────────┬─────────────┘
                                     koneksi kembali    ▼
                                            ┌─────────────────────────┐
                                            │ Kirim ulang otomatis    │
                                            │ (anti-duplikat) →       │
                                            │ lanjut alur normal      │
                                            └─────────────────────────┘
```

**Penjelasan:** Tidak ada foto yang hilang diam-diam; setiap status tertunda terlihat (detail mekanisme di Modul 09).

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Foto Kasus**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| ID Foto | Identitas unik foto dalam kasus | FT-000123-1 |
| Kasus | Kasus induk | KS-2026-000123 |
| Urutan | Foto ke-berapa (min 2, maks 3) | 1 |
| Status kualitas | Layak / ditolak / ambang batas / tidak pasti | Layak |
| Alasan penolakan | Maksimal 3 alasan sederhana | Buram; terlalu gelap |
| Jumlah retake | Berapa kali foto ulang untuk slot ini | 2 |
| Sidik jari berkas | Untuk deteksi duplikat | (otomatis) |

### 5.2 Sample Data

| ID Foto | Kasus | Status Kualitas | Alasan | Retake |
|---|---|---|---|---|
| FT-000123-1 | KS-2026-000123 | Layak | — | 0 |
| FT-000123-2 | KS-2026-000123 | Ditolak | Buram | 1 |
| FT-000119-1 | KS-2026-000119 | Ambang batas | Agak gelap (diterima dengan peringatan) | 0 |

### 5.3 Catatan untuk Tim Downstream

- Data lokasi tertanam pada foto wajib dihapus sebelum penyimpanan; lokasi kasus hanya dari consent Modul 01.
- Foto asli resolusi penuh hanya disimpan bila ada consent penelitian; default hanya versi ternormalisasi.
- Ambang batas kualitas dapat dikonfigurasi dan berversi (diatur di Modul 08).
- Petani tidak pernah melihat skor teknis — hanya alasan sederhana dan tips.

---

## 6. Kebutuhan Data Eksternal

*Di-skip — seluruh input berasal dari kamera/galeri pengguna.*

## 7. Stack Agent Modul

*Di-skip — gerbang kualitas adalah pipeline sistem deterministik, dijelaskan sebagai bagian alur Modul 03.*

## 8. Konfigurasi Alert

*Di-skip — umpan balik kualitas per foto adalah alur normal, bukan alerting.*

---

## 9. Standar Layanan yang Diharapkan

### 9.1 Kecepatan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Buka kamera & pratinjau | Cepat |
| Hasil pemeriksaan kualitas per foto | Cepat — pengguna menunggu di lapangan |
| Unggah foto | Sedang — toleran pada jaringan lemah, yang penting tidak hilang |

### 9.2 Frekuensi Pembaruan Data

| Jenis Data | Frekuensi |
|-----------|-----------|
| Status unggah | Real-time |
| Hasil kualitas | Segera setelah foto diterima |

### 9.3 Ketersediaan Layanan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Jam operasional | 24-7 |
| Toleransi downtime | Rendah pagi hari |
| Konteks bisnis | Pemotretan tetap bisa berjalan offline; hanya analisis yang menunggu koneksi |

---

## 10. Use Case Scenarios

### 10.1 Skenario Foto Diterima Setelah Satu Kali Retake

**Aktor**: Petani
**Goal**: Mendapat 2 foto layak agar kasus bisa dianalisis

```
1. Petani melihat contoh foto baik/buruk, lalu membuka kamera.
2. Foto pertama: daun memenuhi bingkai → pratinjau → "Pakai Foto Ini" → layak.
3. Foto kedua terburu-buru → ditolak "buram" + tips "pegang ponsel dua tangan, tunggu fokus".
4. Petani memotret ulang mengikuti tips → layak.
5. Sistem otomatis melanjutkan kasus ke analisis (Modul 03).
```

### 10.2 Skenario Edge Case — Tiga Kali Gagal, Kirim ke Review

**Aktor**: Penyuluh (mode pendampingan)
**Goal**: Kasus tetap tercatat meski kondisi cahaya sore tidak memungkinkan foto layak

```
1. Penyuluh memotret di sore mendung; foto ditolak "terlalu gelap" tiga kali berturut-turut.
2. Sistem menampilkan opsi "Kirim ke Penyuluh Saja" (tanpa analisis otomatis).
3. Penyuluh konfirmasi; kasus berstatus perlu review manusia dengan foto apa adanya.
4. Kasus muncul di antrean review (Modul 04) bertanda "kualitas foto rendah";
   tidak ada label otomatis yang dibuat.
```

---

## 11. Referensi Implementasi

### 11.1 Plantix

**URL**: https://plantix.net

**Fitur yang Diadaptasi**:
- Panduan bingkai kamera dan contoh foto baik/buruk sebelum memotret
- Umpan balik kualitas instan dengan bahasa awam

### 11.2 Pola verifikasi foto dokumen aplikasi perbankan (KYC)

**Fitur yang Diadaptasi**:
- Deteksi kualitas real-time dengan alasan spesifik dan batas percobaan sebelum jalur manual

---

*Dokumentasi Brief Siaga Padi — Modul: Pengambilan Foto dan Kualitas | FR: FR-003, FR-004 | Versi: 1.0.0*
