# Modul Triase dan Rekomendasi AI

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-005 (CV Inference, Confidence, Evidence, Abstention), FR-006 (Structured Follow-up Triage Questionnaire), FR-007 (AI Recommendation and Explanation Engine). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Ini jantung Siaga Padi: dari foto layak, sistem memberi **indikasi awal** penyakit (4 kelas MVP: Sehat, Blas Daun, Hawar Daun Bakteri, Bercak Cokelat) beserta tingkat keyakinan terkalibrasi — dan berani menjawab "Tidak Yakin" bila foto di luar kompetensinya. Pengguna lalu menjawab maksimal 5 pertanyaan konteks singkat (dari bank pertanyaan yang disetujui ahli), dan mesin rekomendasi menyusun saran tindakan yang **seluruhnya berbasis rujukan tervalidasi** — tanpa dosis, tanpa merek pestisida, tanpa diagnosis final.

Aturan emas: "Tidak Tahu" adalah hasil yang sah, bukan error. Keyakinan rendah, foto konflik, atau bukti kurang → wajib review manusia.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Indikasi terukur & jujur | Keyakinan terkalibrasi dalam band tinggi/sedang/rendah; abstain saat di luar kompetensi |
| Konteks nonvisual terstruktur | Kuesioner singkat dari bank pertanyaan yang disetujui ahli — bukan pertanyaan buatan AI |
| Rekomendasi berbasis bukti | Setiap saran tindakan didukung rujukan basis pengetahuan yang disetujui (Modul 06) |
| Keselamatan di atas kelengkapan | Tanpa dosis/merek/tindakan berisiko tanpa validasi manusia; gagal → fallback aman |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Petani | Indikasi sederhana + tindakan aman sekarang, tanpa jargon |
| Penyuluh | Detail teknis: alternatif prediksi, skor keyakinan, peta sorotan bukti, dasar rujukan |
| Domain Reviewer/POPT | Menilai kualitas keluaran AI untuk kasus ambigu |

---

## 2. Fitur Utama

### 2.1 Hasil Indikasi Awal

**Deskripsi**: Penyajian hasil analisis foto — dua kedalaman: sederhana untuk petani, teknis untuk penyuluh (fakta sama, kedalaman beda).

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu indikasi (petani) | Kartu ringkasan besar | Indikasi + band keyakinan + disclaimer | Saat analisis selesai |
| Panel teknis (penyuluh) | Panel detail | 3 kandidat teratas + skor persis + kualitas foto + versi model | Saat analisis selesai |
| Peta sorotan bukti | Foto dengan area tersorot | Bagian daun dasar prediksi — hanya reviewer, bukan petani | Saat dibuka reviewer |
| Badge "Tidak Yakin" / "Konflik" | Indikator status ikon + teks | Status abstain atau prediksi antar-foto bertentangan | Kondisional |

**Interaksi**:
- Petani hanya melihat indikasi sederhana; penyuluh bisa membuka detail teknis
- Status "Tidak Yakin" → penjelasan mengapa + kasus otomatis masuk antrean review

### 2.2 Kuesioner Konteks

**Deskripsi**: Maksimal 5 pertanyaan lanjutan, satu per layar, dipilih otomatis berdasarkan hasil foto dan fase tanaman.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Layar pertanyaan tunggal | Kartu + tombol besar Ya / Tidak / Tidak Tahu | Pertanyaan dari bank tervalidasi + ilustrasi opsional | Per langkah |
| Keterangan "mengapa ditanya" | Teks penjelas singkat | Alasan pertanyaan relevan | Statis per pertanyaan |
| Indikator progres | Penunjuk "2 dari 4" | Posisi kuesioner | Real-time |

**Interaksi**:
- Jawab atau "Tidak Tahu" — tidak pernah dipaksa; jawaban tidak tahu hanya menambah catatan ketidakpastian
- Mode pendampingan → tercatat penyuluh yang mengisi

### 2.3 Kartu Rekomendasi

**Deskripsi**: Hasil akhir triase — rekomendasi terstruktur dua tampilan dengan rujukan yang bisa dibuka.

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Kartu aksi petani | Kartu ringkasan bertumpuk | Indikasi, lakukan sekarang, pantau, hindari, kapan hubungi penyuluh | Saat rekomendasi siap |
| Kartu teknis penyuluh | Panel detail | Kandidat prediksi, ketidakpastian, kutipan bukti, penanda aturan | Saat rekomendasi siap |
| Laci sumber rujukan | Panel samping | Judul sumber + penanda rujukan per saran | Saat dibuka |
| Badge mode terbatas | Indikator status | Muncul bila hasil dari fallback aturan (Modul 09) | Kondisional |

**Interaksi**:
- Setiap saran tindakan bisa ditelusuri ke sumbernya lewat laci rujukan
- Keyakinan rendah → kartu menekankan ketidakpastian dan eskalasi, bukan saran pasti

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Modul 02 (foto layak) | Otomatis | Layar progres → hasil indikasi (2.1) | ID kasus |
| Hasil indikasi | "Lanjut Jawab Pertanyaan" | Kuesioner konteks (2.2) | ID kasus + set pertanyaan |
| Kuesioner selesai | Otomatis | Layar progres → Kartu Rekomendasi (2.3) | ID kasus + jawaban |
| Kartu rekomendasi | Tautan "Lihat sumber" | Laci sumber rujukan | Daftar penanda rujukan |
| Panel teknis penyuluh | "Buka di Review" | Modul `04_REVIEW_PENYULUH` | ID kasus |
| Kartu rekomendasi petani | Selesai | Modul `01` — Hasil Kasus | ID kasus |

### 3.2 Decision Branch

- **Hasil analisis foto**: keyakinan cukup → lanjut kuesioner; tidak yakin/konflik → tandai wajib review, kuesioner tetap berjalan
- **Penyusunan rekomendasi**: rujukan cukup → rekomendasi penuh; rujukan kurang → keluaran "bukti tidak cukup" + wajib review; layanan AI bahasa gagal → fallback templat aturan (Modul 09)

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `04`: reviewer membuka ulang hasil teknis + peta sorotan bukti
- Dari Modul `08`: perubahan konfigurasi model/ambang memengaruhi kasus baru (bukan kasus lama)

---

## 4. Alur Bisnis

### 4.1 Alur Triase Lengkap (Happy Path)

```
┌────────────┐  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ Foto layak │─▶│ Analisis     │─▶│ Kuesioner maks  │─▶│ Ambil rujukan    │
│ (Modul 02) │  │ gambar: 3    │  │ 5 pertanyaan,   │  │ tervalidasi +    │
└────────────┘  │ kandidat +   │  │ satu per layar  │  │ susun rekomendasi│
                │ keyakinan    │  └─────────────────┘  │ terstruktur      │
                │ terkalibrasi │                       └────────┬─────────┘
                └──────────────┘                                ▼
                                                     ┌──────────────────────┐
                                                     │ Pemeriksaan keamanan │
                                                     │ & rujukan → 2 kartu: │
                                                     │ petani + penyuluh    │
                                                     └──────────────────────┘
```

**Penjelasan:** Pemeriksa keamanan memastikan setiap saran punya rujukan, tidak ada istilah terlarang (dosis/merek), dan format keluaran valid — gagal berulang → fallback aturan.

### 4.2 Alur Abstain / Wajib Review

1. Analisis menghasilkan keyakinan rendah, foto bertentangan, atau objek di luar kompetensi.
2. Sistem menandai "Tidak Yakin" — tidak memaksakan label tunggal.
3. Kasus otomatis wajib review; petani melihat pesan jujur + tindakan aman umum.
4. Kuesioner tetap diminta agar konteks lengkap saat penyuluh meninjau.

### 4.3 Alur Edge Case — Bukti Rujukan Tidak Cukup

```
┌─────────────────┐   ┌──────────────────────┐   ┌───────────────────────────┐
│ Rekomendasi     │──▶│ Rujukan tervalidasi  │──▶│ Mesin AI tidak dipanggil /│
│ mulai disusun   │   │ yang relevan < batas │   │ diminta abstain           │
└─────────────────┘   │ minimum              │   └────────────┬──────────────┘
                      └──────────────────────┘                ▼
                                                 ┌───────────────────────────┐
                                                 │ Keluaran "bukti tidak     │
                                                 │ cukup" + wajib review +   │
                                                 │ tindakan aman generik     │
                                                 └───────────────────────────┘
```

**Penjelasan:** Sistem tidak pernah mengarang saran tanpa dasar rujukan.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Hasil Analisis Foto**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Kasus | Kasus induk | KS-2026-000123 |
| Kandidat teratas | Maks 3 indikasi + skor terkalibrasi | Blas Daun (0,82); Bercak Cokelat (0,11) |
| Band keyakinan | Terjemahan skor untuk petani | Tinggi / Sedang / Rendah |
| Status abstain | Yakin / tidak yakin / konflik antar-foto | Yakin |
| Versi model & ambang | Untuk penelusuran ulang | (dicatat otomatis) |

**Jawaban Kuesioner**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Pertanyaan | Dari bank tervalidasi, berversi | "Apakah bercak menyebar dalam 3 hari terakhir?" |
| Jawaban | Ya / Tidak / Tidak Tahu | Ya |
| Pengisi | Petani sendiri atau penyuluh (assisted) | Petani |
| Penanda urgensi | Hasil aturan dari kombinasi jawaban | Perlu perhatian |

**Rekomendasi**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Tampilan petani | Indikasi, lakukan sekarang, pantau, hindari, eskalasi | (teks sederhana) |
| Catatan penyuluh | Versi teknis dengan ketidakpastian & kutipan bukti | (teks teknis) |
| Rujukan | Daftar penanda sumber per saran | RUJ-BLAS-004, RUJ-UMUM-001 |
| Asal keluaran | Mesin AI / fallback aturan | Mesin AI |

### 5.2 Sample Data

| Kasus | Indikasi Teratas | Band | Status | Asal Rekomendasi |
|---|---|---|---|---|
| KS-2026-000123 | Blas Daun | Tinggi | Lengkap | Mesin AI |
| KS-2026-000119 | Tidak Yakin | — | Wajib review | Tindakan aman generik |
| KS-2026-000110 | Hawar Daun Bakteri | Sedang | Lengkap (mode terbatas) | Fallback aturan |

### 5.3 Catatan untuk Tim Downstream

- Data ke layanan AI bahasa eksternal dibatasi ketat: hasil analisis + konteks + rujukan; **tanpa** nama, telepon, koordinat persis, atau foto mentah.
- Hasil analisis AI tidak bisa diubah; koreksi manusia membuat versi baru (Modul 04).
- Versi model, bank pertanyaan, rujukan, dan ambang dicatat per kasus untuk reproduksibilitas.
- Penanda urgensi kuesioner tidak pernah mengubah label analisis diam-diam — hanya menambah konteks/eskalasi.

---

## 6. Kebutuhan Data Eksternal

### 6.1 Sumber

| Sumber | Jenis | Frekuensi |
|--------|-------|-----------|
| Layanan AI bahasa eksternal (dengan jalur cadangan) | Layanan penyusun narasi rekomendasi — bukan sumber data | Per kasus |

### 6.2 Catatan

- Layanan utama gratis punya batas pemakaian; jalur cadangan dan fallback aturan wajib teruji (pemilihan penyedia di Modul 08, fallback di Modul 09).
- Konten pengetahuan bukan dari internet bebas — hanya dari basis pengetahuan terkurasi (Modul 06).

## 7. Stack Agent Modul

*Di-skip — pipeline analisis (gerbang kualitas → analisis gambar → pemilih pertanyaan → pengambil rujukan → penyusun rekomendasi → pemeriksa keamanan) adalah rangkaian layanan sistem deterministik dengan satu pemanggilan AI bahasa yang dibatasi ketat; bukan agent workforce otonom.*

## 8. Konfigurasi Alert

### 8.1 Threshold Eskalasi (dikonfigurasi di Modul 08)

| Kondisi | Threshold | Aksi |
|---------|-----------|------|
| Keyakinan tinggi, tanpa konflik | Di atas ambang keyakinan | Hasil otomatis tersedia; review opsional |
| Keyakinan sedang/rendah | Di bawah ambang | Wajib review; petani melihat penekanan ketidakpastian |
| Tidak yakin / di luar kompetensi / konflik | Kondisi abstain | Wajib review; tanpa label final; tindakan aman generik |
| Kombinasi jawaban kuesioner berisiko | Aturan urgensi terpenuhi | Penanda urgensi + prioritas naik di antrean review |

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Analisis gambar | Sedang — pengguna menunggu dengan progres bertahap |
| Kuesioner (per layar) | Cepat |
| Penyusunan rekomendasi | Sedang; alur foto-sampai-rekomendasi terasa satu tarikan napas |
| Ketersediaan | 24-7; bila komponen AI gagal, fallback aman selalu tersedia (tidak boleh buntu) |

---

## 10. Use Case Scenarios

### 10.1 Skenario Triase Berhasil dengan Keyakinan Tinggi

**Aktor**: Petani
**Goal**: Tahu indikasi dan tindakan awal yang aman

```
1. Dua foto layak; layar progres menunjukkan "Analisis gambar…".
2. Hasil: "Kemungkinan Blas Daun — keyakinan tinggi. Ini indikasi awal, bukan
   diagnosis final."
3. Petani menjawab 4 pertanyaan (satu dijawab "Tidak Tahu").
4. Kartu rekomendasi: 3 tindakan aman sekarang, 2 hal dipantau, 2 hal dihindari,
   kapan menghubungi penyuluh — masing-masing dengan rujukan.
5. Petani membuka laci sumber, melihat judul panduan resminya.
```

### 10.2 Skenario Edge Case — Foto Konflik Antar-Prediksi

**Aktor**: Penyuluh
**Goal**: Kasus ambigu tidak diberi label paksa

```
1. Foto 1 mengarah ke Blas Daun, foto 2 ke Bercak Cokelat, selisih melewati ambang
   konflik.
2. Sistem tidak memilih label tunggal; badge "Konflik" tampil, kasus wajib review.
3. Penyuluh membuka panel teknis: kedua kandidat, skor, peta sorotan bukti per foto.
4. Penyuluh memutuskan lewat Modul 04; petani sementara menerima tindakan aman umum.
```

---

## 11. Referensi Implementasi

### 11.1 Rice Doctor (IRRI)

**URL**: https://www.knowledgebank.irri.org

**Fitur yang Diadaptasi**:
- Triase bertingkat: gejala visual → pertanyaan konteks → saran berbasis panduan resmi

### 11.2 Plantix

**URL**: https://plantix.net

**Fitur yang Diadaptasi**:
- Pemisahan indikasi vs rekomendasi; penyajian keyakinan dalam bahasa awam

---

*Dokumentasi Brief Siaga Padi — Modul: Triase dan Rekomendasi AI | FR: FR-005, FR-006, FR-007 | Versi: 1.0.0*
