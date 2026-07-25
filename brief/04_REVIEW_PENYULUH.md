# Modul Review Penyuluh

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-008 (Penyuluh Review, Correction, dan Follow-up). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Hasil AI di Siaga Padi tidak pernah berhenti pada prediksi otomatis. Modul ini tempat penyuluh (dan domain reviewer/POPT) meninjau seluruh bukti — foto, kualitas, kandidat prediksi, jawaban kuesioner, rekomendasi beserta rujukannya — lalu mengonfirmasi, mengoreksi dengan alasan, meminta foto tambahan, atau mengeskalasi. Hasil AI bersifat permanen; koreksi manusia membuat versi review baru sehingga jejak "sebelum vs sesudah" selalu bisa ditelusuri.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Human-in-the-loop nyata | Kasus keyakinan rendah tidak pernah final otomatis; wajib penilaian manusia |
| Koreksi akuntabel | Setiap koreksi wajib alasan; versi AI dan versi manusia tersimpan berdampingan |
| Tindak lanjut tercatat | Follow-up (kunjungan, saran, eskalasi POPT) tercatat pada linimasa kasus |
| Umpan balik untuk model | Koreksi yang memenuhi consent mengalir ke antrean dataset (Modul 07) |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Penyuluh | Antrean prioritas kasus wilayah binaan, alat tinjau lengkap, aksi cepat |
| Domain Reviewer/POPT | Menangani eskalasi dan kasus ambigu di luar kompetensi penyuluh |

---

## 2. Fitur Utama

### 2.1 Antrean Review Prioritas

**Deskripsi**: Daftar kasus menunggu tinjauan, diurutkan berdasarkan alasan keselamatan (abstain, urgensi, konflik) — bukan sekadar keyakinan tertinggi.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Daftar antrean | Tabel/kartu dengan filter | Kasus per wilayah binaan, alasan review, umur antrean | Per menit |
| Penanda alasan review | Indikator ikon + teks | Tidak yakin / konflik / urgensi / permintaan petani | Real-time |
| Filter | Bilah filter | Wilayah, status, alasan, rentang waktu | Manual |

**Interaksi**:
- Klik baris kasus → layar detail review
- Filter dan urutkan sesuai prioritas kerja hari itu

### 2.2 Layar Detail Review

**Deskripsi**: Semua bukti kasus dalam satu layar, foto bersanding dengan sorotan bukti.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Foto bersanding + sorotan bukti | Galeri perbandingan | Foto kasus + peta sorotan area dasar prediksi | Saat dibuka |
| Panel hasil AI | Panel detail | Kandidat prediksi + skor + kualitas + versi model | Saat dibuka |
| Panel konteks | Daftar ringkas | Jawaban kuesioner + penanda urgensi | Saat dibuka |
| Panel rekomendasi & rujukan | Panel detail | Rekomendasi tersaji + daftar rujukan | Saat dibuka |
| Riwayat kasus | Linimasa kronologis | Semua peristiwa kasus | Saat dibuka |
| Bilah aksi tetap (sticky) | Bilah tombol selalu terlihat | Konfirmasi / Koreksi / Minta Foto / Eskalasi | Statis |

**Interaksi**:
- Konfirmasi label AI, atau koreksi ke kelas lain (hanya dari taksonomi resmi; di luar itu wajib "Lainnya/Tidak Diketahui")
- Wajib memilih alasan dari daftar + catatan bebas opsional

### 2.3 Tindak Lanjut

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Form tindak lanjut | Form pilihan + catatan | Jenis (pantau, kunjungan, eskalasi POPT), tenggat | Manual |
| Linimasa tindak lanjut | Linimasa kronologis | Direncanakan → dilakukan → selesai | Setiap perubahan |

**Interaksi**:
- Tandai selesai / jadwalkan ulang; kasus tertutup setelah catatan akhir terisi
- Petani otomatis menerima pembaruan status bahasa sederhana (komentar internal tidak terlihat petani)

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Beranda penyuluh / Modul 05 | Kartu "Perlu Review" | Antrean Review (2.1) | Filter wilayah binaan |
| Antrean review | Klik baris kasus | Layar Detail Review (2.2) | ID kasus |
| Detail review | Tombol "Koreksi" | Modal pilihan kelas + alasan | ID kasus + label AI |
| Detail review | "Minta Foto/Data Tambahan" | Konfirmasi → kasus status revisi | ID kasus + panduan pengguna |
| Detail review | "Eskalasi ke POPT" | Modal eskalasi | ID kasus + ringkasan |
| Keputusan tersimpan | Otomatis | Form Tindak Lanjut (2.3) | ID kasus + keputusan |

### 3.2 Decision Branch

- **Keputusan review**: konfirmasi → direview; koreksi → versi manusia baru + alasan wajib; bukti kurang → status revisi + panduan; ambigu berat → eskalasi POPT
- **Setelah keputusan**: koreksi dengan consent riset → otomatis dinominasikan ke antrean dataset (Modul 07)

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `05`: drill-down kasus → langsung ke Detail Review (2.2)
- Dari Modul `03`: panel teknis penyuluh → "Buka di Review"
- Dari Modul `01`: permintaan review oleh petani → kasus masuk antrean (2.1)

---

## 4. Alur Bisnis

### 4.1 Alur Review Kasus (Happy Path)

```
┌──────────────┐  ┌────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ Penyuluh buka│─▶│ Pilih kasus    │─▶│ Tinjau bukti:    │─▶│ Pilih outcome  │
│ antrean      │  │ teratas (alasan│  │ foto + AI +      │  │ + alasan +     │
│ prioritas    │  │ keselamatan)   │  │ konteks + rujukan│  │ tindak lanjut  │
└──────────────┘  └────────────────┘  └──────────────────┘  └───────┬────────┘
                                                                    ▼
                                                     ┌──────────────────────────┐
                                                     │ Versi review tersimpan   │
                                                     │ (audit sebelum/sesudah) +│
                                                     │ petani dinotifikasi      │
                                                     └──────────────────────────┘
```

**Penjelasan:** Antrean default memprioritaskan alasan keselamatan. Keputusan tanpa alasan tidak bisa disimpan.

### 4.2 Alur Eskalasi ke POPT

1. Penyuluh menandai kasus "Eskalasi" dengan ringkasan kondisi.
2. Domain reviewer/POPT melihat kasus di antreannya.
3. Sistem hanya mencatat proses; kunjungan lapangan terjadi di luar sistem, hasilnya dicatat sebagai tindak lanjut.

### 4.3 Alur Edge Case — Bukti Tidak Cukup untuk Memutuskan

```
┌────────────────┐   ┌─────────────────────┐   ┌──────────────────────────┐
│ Reviewer ragu: │──▶│ "Minta Foto/Data    │──▶│ Kasus status REVISI +    │
│ foto kurang    │   │ Tambahan" + tulis   │   │ pengguna menerima        │
│ jelas          │   │ panduan             │   │ panduan spesifik         │
└────────────────┘   └─────────────────────┘   └────────────┬─────────────┘
                                                            ▼
                                              ┌──────────────────────────┐
                                              │ Foto baru masuk → kasus  │
                                              │ kembali ke antrean dengan│
                                              │ prioritas dipertahankan  │
                                              └──────────────────────────┘
```

**Penjelasan:** Reviewer tidak dipaksa memutuskan dari bukti buruk; siklus revisi tercatat di linimasa.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Review Kasus**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Kasus | Kasus yang ditinjau | KS-2026-000119 |
| Hasil AI (beku) | Label + skor versi AI, tidak bisa diubah | Tidak Yakin |
| Keputusan manusia | Konfirmasi / koreksi / revisi / eskalasi | Koreksi → Bercak Cokelat |
| Alasan | Wajib, dari daftar + catatan bebas | "Pola bercak khas, foto kurang cahaya" |
| Reviewer | Siapa yang memutuskan | Bu Sari (Penyuluh) |
| Nominasi dataset | Layak masuk antrean dataset (Modul 07)? | Ya (consent riset ada) |

**Tindak Lanjut**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Jenis | Pantau / kunjungan / eskalasi POPT | Kunjungan lapangan |
| Tenggat & status | Rencana dan realisasi | 28 Jul — direncanakan |
| Catatan penutup | Wajib sebelum kasus ditutup | (teks) |

### 5.2 Sample Data

| Kasus | Hasil AI | Keputusan | Reviewer | Tindak Lanjut |
|---|---|---|---|---|
| KS-2026-000119 | Tidak Yakin | Koreksi → Bercak Cokelat | Bu Sari | Kunjungan 28 Jul |
| KS-2026-000123 | Blas Daun (tinggi) | Konfirmasi | Bu Sari | Pantau 7 hari |
| KS-2026-000107 | Konflik | Eskalasi POPT | Pak Dedi | Menunggu POPT |

### 5.3 Catatan untuk Tim Downstream

- Hasil AI tidak boleh ditimpa — koreksi selalu membuat versi review baru dengan audit sebelum/sesudah.
- Kasus keyakinan rendah tidak boleh bisa ditandai final otomatis, oleh siapa pun.
- Petani hanya melihat status + penjelasan sederhana; komentar internal reviewer tidak pernah bocor.
- Nominasi dataset terpisah dari alur review dan tunduk pada consent (Modul 07).

---

## 6. Kebutuhan Data Eksternal

*Di-skip — seluruh bukti berasal dari internal sistem.*

## 7. Stack Agent Modul

*Di-skip — modul keputusan manusia; otomasi hanya penyusunan antrean prioritas berbasis aturan.*

## 8. Konfigurasi Alert

*Di-skip — prioritas antrean dan tenggat tindak lanjut ditampilkan di Modul 05; threshold eskalasi triase diatur di Modul 03/08.*

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Buka antrean & detail kasus | Cepat — reviewer memproses banyak kasus |
| Simpan keputusan | Cepat |
| Frekuensi pembaruan antrean | Per menit |
| Ketersediaan | Jam kerja diperpanjang; target waktu review ≤ 24 jam dari kasus masuk (baseline pilot) |

---

## 10. Use Case Scenarios

### 10.1 Skenario Review Pagi oleh Penyuluh

**Aktor**: Penyuluh
**Goal**: Menyelesaikan antrean review sebelum kunjungan lapangan

```
1. Penyuluh membuka antrean: 6 kasus, 2 bertanda "Tidak Yakin" di atas.
2. Kasus pertama: foto bersanding + sorotan bukti; kuesioner menunjukkan penyebaran cepat.
3. Penyuluh mengoreksi label ke Bercak Cokelat, memilih alasan, menulis catatan.
4. Mengisi tindak lanjut: kunjungan lapangan 3 hari lagi.
5. Petani menerima notifikasi "Hasil sudah dikonfirmasi penyuluh" dengan penjelasan baru.
6. Koreksi ternominasi otomatis ke antrean dataset (consent riset ada).
```

### 10.2 Skenario Edge Case — Reviewer Minta Foto Tambahan

**Aktor**: Domain Reviewer (POPT)
**Goal**: Tidak memutuskan dari bukti yang meragukan

```
1. Kasus eskalasi dibuka: dua foto sah tapi gejala tidak khas.
2. Reviewer memilih "Minta Foto/Data Tambahan": foto bagian batang + pertanyaan kondisi air.
3. Kasus berstatus revisi; petani menerima panduan spesifik lewat Modul 01.
4. Dua hari kemudian foto baru masuk; kasus kembali ke antrean POPT dan diputuskan.
```

---

## 11. Referensi Implementasi

### 11.1 Pola antrean moderasi konten

**Fitur yang Diadaptasi**:
- Antrean prioritas berbasis alasan + bilah aksi tetap + alasan wajib per keputusan

### 11.2 SP4N-LAPOR!

**URL**: https://www.lapor.go.id

**Fitur yang Diadaptasi**:
- Siklus tindak lanjut berjenjang dengan status yang terlihat pelapor dalam bahasa sederhana

---

*Dokumentasi Brief Siaga Padi — Modul: Review Penyuluh | FR: FR-008 | Versi: 1.0.0*
