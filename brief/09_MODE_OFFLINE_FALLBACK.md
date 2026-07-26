# Modul Mode Offline dan Fallback

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-014 (Offline/Degraded Mode dan Rule-based Fallback). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Sawah bukan tempat dengan sinyal bagus. Modul ini menjamin dua hal saat koneksi, peta, layanan AI, atau penyimpanan terganggu: **tidak ada pekerjaan pengguna yang hilang** (draf dan foto tersimpan lokal, terkirim otomatis saat online) dan **tidak ada kegagalan diam-diam** (setiap status tertunda/gagal terlihat jelas). Bila mesin AI bahasa gagal, rekomendasi diganti templat berbasis aturan dari konten tervalidasi — dan bila analisis gambar tidak tersedia, sistem hanya menyimpan kasus untuk direview manusia, tidak pernah mengarang label.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Tidak ada data hilang | Draf/foto tersimpan lokal (kedaluwarsa 7 hari), terkirim otomatis dengan anti-duplikat |
| Tidak ada kegagalan diam-diam | Setiap status tertunda/gagal terlihat + tindakan berikutnya jelas |
| Degradasi bertingkat aman | AI bahasa gagal → templat aturan; analisis gambar gagal → simpan + review manusia, tanpa label |
| Peta bukan blocker | Gangguan peta tidak pernah menghambat alur inti |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Petani/Penyuluh | Tetap bisa membuat kasus dan memotret di area tanpa sinyal |
| Admin/Operasional | Melihat antrean tertunda dan error sistem untuk penanganan |

---

## 2. Fitur Utama

### 2.1 Banner Status dan Antrean Tertunda

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Banner offline | Bilah status di atas layar | "Anda offline — pekerjaan tersimpan di perangkat" | Real-time |
| Penghitung tertunda | Indikator angka | Jumlah draf/foto menunggu kirim | Real-time |
| Waktu sinkron terakhir | Teks kecil | Kapan terakhir berhasil sinkron | Setiap sinkron |
| Tombol "Coba Kirim Ulang" | Tombol aksi | — | Saat ada gagal |

**Interaksi**: banner menampilkan layanan mana yang terganggu dan apa yang masih berfungsi; klik penghitung → daftar item tertunda/gagal per kasus.

### 2.2 Sinkronisasi Otomatis

**Deskripsi**: Saat koneksi kembali, item tertunda dikirim otomatis dengan jeda coba-ulang membesar, batas percobaan, dan anti-duplikat.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Status per item | Daftar dengan indikator | Menunggu / mengirim / terkirim / gagal / konflik | Real-time |
| Catatan konflik | Panel detail | Item ditolak server karena bentrok — tersimpan untuk ditinjau | Saat konflik |

**Interaksi**: item gagal melewati batas percobaan → diarsip gagal + tombol coba ulang manual; pesan "tersimpan di perangkat, menunggu terkirim" tidak pernah mengaku sudah sampai server.

### 2.3 Mode Terbatas (Fallback)

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Badge "mode terbatas" | Indikator status pada kartu hasil | Hasil dari templat aturan, bukan mesin AI penuh | Kondisional |
| Kartu arahan aman | Kartu ringkasan | Tindakan aman generik dari konten tervalidasi + ajakan hubungi penyuluh | Kondisional |

**Interaksi**: pengguna selalu tahu hasilnya versi terbatas; saat layanan pulih, kasus dapat diproses ulang penuh.

### 2.4 Panel Backlog (Admin)

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu backlog & error | Kartu ringkasan + tabel | Antrean tertunda agregat, tingkat kegagalan, layanan terganggu | Per menit |

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Semua layar (offline) | Otomatis | Banner offline muncul | Layanan terganggu |
| Banner / penghitung | Klik | Daftar item tertunda per kasus | Status per item |
| Daftar item gagal | "Coba Kirim Ulang" | Proses kirim ulang | ID item |
| Kartu hasil (Modul 01/03) | Badge "mode terbatas" | Penjelasan mode terbatas | Layanan yang gagal |
| Menu admin | "Kesehatan Sistem" | Panel Backlog (2.4) | — |

### 3.2 Decision Branch

- **Jenis gangguan**: hanya AI bahasa → analisis gambar & kuesioner jalan terus, rekomendasi dari templat aturan; analisis gambar mati → kasus tersimpan + antre review manusia, tanpa label; offline total → semua tersimpan lokal, tanpa diagnosis sampai online
- **Perangkat bersama dipilih saat login** → draf lokal dihapus saat keluar

### 3.3 Navigasi Masuk dari Modul Lain

- Modul `02`: unggahan tertunda dikelola mekanisme modul ini
- Modul `03`: fallback templat aturan dipicu kegagalan penyedia (kesehatan penyedia di Modul 08)

---

## 4. Alur Bisnis

### 4.1 Alur Offline Penuh di Sawah (Happy Path Degradasi)

```
┌──────────────┐  ┌───────────────────┐  ┌────────────────────────┐
│ Tanpa sinyal:│─▶│ Kasus + foto      │─▶│ Banner: "offline —     │
│ petani buat  │  │ tersimpan lokal   │  │ tersimpan di perangkat,│
│ kasus + foto │  │ (kedaluwarsa 7hr) │  │ 3 item menunggu"       │
└──────────────┘  └───────────────────┘  └───────────┬────────────┘
                                       sinyal kembali▼
                                         ┌────────────────────────┐
                                         │ Sinkron otomatis anti- │
                                         │ duplikat → alur normal │
                                         │ (kualitas → analisis)  │
                                         └────────────────────────┘
```

**Penjelasan:** Tidak ada diagnosis yang ditampilkan selama analisis belum berjalan — tidak pernah mengarang hasil.

### 4.2 Alur Fallback Berbasis Aturan (AI Bahasa Gagal)

1. Penyusun rekomendasi mendeteksi penyedia gagal/timeout setelah percobaan terbatas.
2. Perender fallback menyusun arahan dari hasil analisis gambar + penanda kuesioner + templat konten tervalidasi.
3. Kartu hasil tampil dengan badge "mode terbatas"; kegagalan AI bahasa tidak pernah menggagalkan hasil analisis gambar.

### 4.3 Alur Edge Case — Item Gagal Melewati Batas Percobaan

```
┌──────────────┐   ┌────────────────────┐   ┌──────────────────────────┐
│ Kirim ulang  │──▶│ Batas percobaan    │──▶│ Item diarsip "gagal" +   │
│ otomatis     │   │ tercapai           │   │ tetap terlihat di daftar │
│ berulang     │   └────────────────────┘   │ + tombol coba manual     │
└──────────────┘                            └────────────┬─────────────┘
                                        server menolak   ▼ (konflik)
                                            ┌──────────────────────────┐
                                            │ Catatan konflik disimpan │
                                            │ utuh untuk ditinjau —    │
                                            │ tidak ditimpa diam-diam  │
                                            └──────────────────────────┘
```

**Penjelasan:** Gagal permanen dan konflik tidak pernah dibuang — selalu terlihat dan bisa ditindaklanjuti.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Antrean Tertunda (di perangkat)**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Jenis item | Draf kasus / foto / jawaban kuesioner | Foto |
| Kasus terkait | Induk item | KS-2026-000130 |
| Status | Menunggu / mengirim / gagal / konflik | Menunggu |
| Percobaan | Jumlah percobaan kirim | 1 dari 3 |
| Kedaluwarsa | Batas simpan lokal | 7 hari |

### 5.2 Sample Data

| Jenis | Kasus | Status | Percobaan |
|---|---|---|---|
| Foto | KS-2026-000130 | Menunggu | 0 |
| Draf kasus | KS-2026-000131 | Gagal (arsip) | 3 |
| Jawaban kuesioner | KS-2026-000129 | Konflik (tersimpan) | 1 |

### 5.3 Catatan untuk Tim Downstream

- Penyimpanan lokal maksimal 7 hari; dihapus saat keluar bila "perangkat bersama" dipilih.
- Pengiriman ulang wajib anti-duplikat (kunci sama = tidak dobel).
- Sebagian mekanisme sisi web sudah diimplementasi pada branch `feat/offline-pwa-support` (antrean opt-in, batas percobaan, penyimpanan konflik, banner status) — tinjau implementasi itu sebelum menulis ulang; formulir kasus/foto ke depan harus memakai jalur antrean opt-in tersebut secara eksplisit.

---

## 6. Kebutuhan Data Eksternal

*Di-skip — modul ketahanan internal.*

## 7. Stack Agent Modul

*Di-skip — sinkronisasi dan fallback adalah mekanisme sistem deterministik.*

## 8. Konfigurasi Alert

### 8.1 Threshold (tampilan admin)

| Kondisi | Threshold | Aksi |
|---------|-----------|------|
| Backlog normal | Di bawah ambang antrean | Indikator hijau |
| Backlog menumpuk | Melewati ambang antrean tertunda | Indikator kuning di panel admin |
| Kegagalan sistemik | Tingkat gagal melewati ambang | Indikator merah + penanganan operasional |

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Simpan lokal saat offline | Cepat — tanpa terasa oleh pengguna |
| Sinkronisasi saat online kembali | Otomatis, latar belakang |
| Kejelasan status | Setiap item tertunda/gagal selalu terlihat — tanpa kegagalan diam-diam |
| Ketersediaan fallback | Kasus tetap mendapat keluaran aman saat AI bahasa gagal — mendekati selalu |

---

## 10. Use Case Scenarios

### 10.1 Skenario Petani di Area Tanpa Sinyal

**Aktor**: Petani
**Goal**: Pekerjaan pagi tidak hilang walau tanpa sinyal

```
1. Di tengah sawah tanpa sinyal, petani membuat kasus + 2 foto.
2. Banner: "Anda offline — 3 item tersimpan di perangkat, akan terkirim otomatis."
3. Petani pulang; tersambung jaringan → sinkron otomatis berjalan.
4. Notifikasi: "3 item terkirim; analisis dimulai." Alur normal berlanjut.
```

### 10.2 Skenario Edge Case — Hanya Layanan AI Bahasa Gagal

**Aktor**: Petani + Sistem
**Goal**: Tetap dapat arahan aman meski mesin rekomendasi tumbang

```
1. Analisis gambar selesai (indikasi Blas Daun, keyakinan tinggi); kuesioner terisi.
2. Penyedia AI bahasa gagal setelah percobaan terbatas.
3. Fallback menyusun arahan dari templat konten tervalidasi sesuai indikasi + penanda.
4. Kartu hasil tampil dengan badge "mode terbatas" + ajakan menghubungi penyuluh.
5. Saat penyedia pulih, kasus dapat diproses ulang untuk rekomendasi penuh.
```

---

## 11. Referensi Implementasi

### 11.1 Pola aplikasi pesan (antrean kirim + status per pesan)

**Fitur yang Diadaptasi**:
- Status per item (jam pasir / centang / gagal) + kirim ulang manual, tanpa kehilangan diam-diam

### 11.2 Aplikasi survei/pendataan lapangan (mis. KoboToolbox)

**Fitur yang Diadaptasi**:
- Simpan-lokal-dulu dengan sinkronisasi saat online, dirancang untuk area sinyal lemah

---

*Dokumentasi Brief Siaga Padi — Modul: Mode Offline dan Fallback | FR: FR-014 | Versi: 1.0.0*
