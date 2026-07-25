# Modul Tata Kelola Pengetahuan

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-011 (Knowledge-base Governance dan Citation). Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Semua rekomendasi Siaga Padi harus bisa dijawab dengan "dari mana saran ini berasal?". Modul ini mengelola basis pengetahuan terkurasi: admin mendaftarkan sumber resmi (panduan pemerintah, publikasi penelitian), sistem memecahnya menjadi potongan rujukan berpenanda stabil, dan domain reviewer menyetujui sebelum apa pun boleh dipakai mesin rekomendasi. Setiap perubahan membuat versi baru — keluaran lama tetap bisa ditelusuri ke versi rujukan yang dipakainya saat itu.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Hanya sumber disetujui | Mesin rekomendasi hanya menarik entri berstatus disetujui dan belum kedaluwarsa |
| Rujukan tertelusur | Setiap potongan punya penanda stabil + versi sumber + lokasi halaman/bagian bila ada |
| Versi, bukan timpa | Perubahan konten membuat versi baru; versi lama menopang keluaran historis |
| Kendali konten berisiko | Dokumen bermuatan dosis/merek diberi penanda kebijakan — tidak otomatis boleh dinarasikan |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Admin | Mendaftarkan sumber, metadata lisensi, mengelola siklus versi |
| Domain Reviewer/POPT | Meninjau dan menyetujui potongan rujukan, menandai konten berisiko |

---

## 2. Fitur Utama

### 2.1 Katalog Sumber

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Daftar sumber | Tabel daftar dengan filter | Penerbit, tanggal, lisensi, status persetujuan, terakhir ditinjau | Manual |
| Form pendaftaran sumber | Form bertahap | Identitas dokumen, lisensi/izin pakai, kategori | Manual |

**Interaksi**: daftar sumber baru → sistem mengekstrak dan memecah konten menjadi potongan; filter per status/penerbit.

### 2.2 Review dan Persetujuan Potongan

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Pratinjau potongan | Panel detail per potongan | Teks + penanda penyakit, jenis tindakan, audiens, risiko | Manual |
| Alur persetujuan | Daftar antrean + tombol setujui/tolak | Potongan menunggu review | Manual |
| Tampilan banding versi (diff) | Panel perbandingan | Perubahan antar versi | Saat dibuka |

**Interaksi**: reviewer menyetujui/menolak per potongan; potongan bermuatan dosis/merek wajib penanda kebijakan; persetujuan memicu pengindeksan.

### 2.3 Uji Pengambilan Rujukan

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Panel uji coba | Form pertanyaan uji + hasil | Potongan yang terambil untuk kombinasi penyakit/konteks | On-demand |

**Interaksi**: admin/reviewer menguji "kasus Blas Daun fase anakan → rujukan apa yang terambil?" sebelum versi diaktifkan.

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Menu admin | "Basis Pengetahuan" | Katalog Sumber (2.1) | — |
| Katalog sumber | Klik baris sumber | Daftar potongan sumber itu | ID sumber + versi |
| Daftar potongan | Klik potongan | Pratinjau + persetujuan (2.2) | ID potongan |
| Pratinjau potongan | "Bandingkan versi" | Tampilan diff | Dua versi terpilih |
| Katalog | "Uji Pengambilan" | Panel uji coba (2.3) | Versi indeks aktif |
| Laci sumber (Modul 03) | Klik penanda rujukan | Pratinjau potongan (baca-saja) | Penanda rujukan |

### 3.2 Decision Branch

- **Sumber diperbarui penerbit** → versi baru; versi lama tetap tersedia untuk penelusuran historis
- **Sumber tidak lagi tersedia online** → salinan arsip/sidik jari disimpan bila legal; entri ditandai status ketersediaan
- **Potongan ditolak** → tidak pernah masuk indeks aktif; alasan penolakan tercatat

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `03`: laci sumber rekomendasi menaut ke pratinjau potongan (baca-saja)
- Dari Modul `08`: aktivasi versi KB adalah perubahan kritis yang butuh persetujuan orang kedua

---

## 4. Alur Bisnis

### 4.1 Alur Kurasi Sumber Baru (Happy Path)

```
┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐
│ Admin daftar │─▶│ Sistem ekstrak │─▶│ Admin isi       │─▶│ Domain reviewer    │
│ sumber +     │  │ & pecah jadi   │  │ penanda:        │  │ tinjau & setujui   │
│ lisensi      │  │ potongan       │  │ penyakit, jenis │  │ per potongan       │
└──────────────┘  └────────────────┘  │ tindakan, risiko│  └─────────┬──────────┘
                                      └─────────────────┘            ▼
                                                          ┌────────────────────┐
                                                          │ Potongan terindeks │
                                                          │ → bisa diambil     │
                                                          │ mesin rekomendasi  │
                                                          └────────────────────┘
```

**Penjelasan:** Hanya potongan disetujui yang masuk indeks aktif. Jejak audit dibuat pada setiap persetujuan.

### 4.2 Alur Revisi dan Pensiun Sumber

1. Penerbit merilis edisi baru → admin membuat versi sumber baru.
2. Reviewer meninjau potongan yang berubah (tampilan diff mempermudah).
3. Versi baru diaktifkan → indeks aktif mengikuti; keluaran lama tetap menaut versi lama.
4. Sumber usang dipensiunkan → keluar dari indeks aktif tanpa menghapus riwayat.

### 4.3 Alur Edge Case — Rujukan Sudah Dipensiunkan

```
┌────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────┐
│ Penyuluh membuka   │──▶│ Rujukan versi lama    │──▶│ Pratinjau tetap terbuka  │
│ kasus lama, klik   │   │ terdeteksi (bukan     │   │ (versi historis) + label │
│ rujukan            │   │ indeks aktif)         │   │ "versi lama — sudah      │
└────────────────────┘   └───────────────────────┘   │ diperbarui/dipensiunkan" │
                                                     └──────────────────────────┘
```

**Penjelasan:** Ketelusuran historis tidak pernah putus, tetapi pengguna selalu tahu bila rujukan sudah tidak berlaku.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Sumber Pengetahuan**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Judul & penerbit | Identitas dokumen | "Pengendalian Penyakit Blas" — BB Padi |
| Tanggal & versi | Edisi/versi sumber | 2024, v2 |
| Lisensi/izin pakai | Dasar legal penggunaan | Dokumen publik pemerintah |
| Status | Draf / disetujui / dipensiunkan | Disetujui |

**Potongan Rujukan**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Penanda rujukan | Stabil, dipakai di kartu rekomendasi | RUJ-BLAS-004 |
| Lokasi | Halaman/bagian pada sumber | Hal. 12, §3.2 |
| Penanda konten | Penyakit, jenis tindakan, audiens, risiko | Blas Daun; kultur teknis; petani; aman |
| Penanda kebijakan | Kendali narasi konten berisiko | "memuat dosis — tidak untuk dinarasikan" |
| Status & versi | Persetujuan per versi | Disetujui v2 |

### 5.2 Sample Data

| Penanda | Sumber | Penyakit | Risiko | Status |
|---|---|---|---|---|
| RUJ-BLAS-004 | BB Padi 2024 | Blas Daun | Aman | Disetujui |
| RUJ-HDB-002 | Balai POPT 2023 | Hawar Daun Bakteri | Memuat dosis (dibatasi) | Disetujui + penanda kebijakan |
| RUJ-UMUM-001 | IRRI Knowledge Bank | Umum | Aman | Disetujui |

### 5.3 Catatan untuk Tim Downstream

- Indeks pengambilan hanya membaca potongan disetujui + belum kedaluwarsa; draf tidak boleh bocor ke keluaran pengguna.
- Log pengambilan cukup menyimpan penanda rujukan — bukan seluruh isi permintaan sensitif.
- Aktivasi versi KB tunduk pada review orang kedua (Modul 08).

---

## 6. Kebutuhan Data Eksternal

### 6.1 Sumber

| Sumber | Instansi | Jenis Data | Frekuensi |
|--------|----------|------------|-----------|
| Panduan pengendalian penyakit padi | BB Padi / Balitbangtan (Kementan) | Panduan resmi per penyakit | Saat edisi baru terbit |
| Materi perlindungan tanaman | Balai POPT | Prosedur pengendalian & eskalasi | Saat edisi baru terbit |
| Rice Knowledge Bank | IRRI | Panduan praktik internasional | Saat edisi baru terbit |

### 6.2 Catatan

- Sebagian besar dokumen publik; tetap catat lisensi/izin pakai per sumber.
- Pengumpulan dokumen manual oleh admin pada MVP — tidak ada crawler otomatis.

## 7. Stack Agent Modul

*Di-skip — kurasi adalah alur kerja manusia; ekstraksi/pemecahan dokumen adalah pemrosesan sistem biasa.*

## 8. Konfigurasi Alert

*Di-skip — peninjauan ulang berkala sumber ditangani sebagai daftar kerja admin.*

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Navigasi katalog & pratinjau | Sedang |
| Uji pengambilan | Sedang |
| Frekuensi pembaruan | Manual — mengikuti ritme kurasi |
| Ketersediaan | Jam kerja; modul internal, bukan jalur kritis petani (indeks aktif runtime harus selalu tersedia) |

---

## 10. Use Case Scenarios

### 10.1 Skenario Kurasi Panduan Baru

**Aktor**: Admin + Domain Reviewer
**Goal**: Panduan resmi terbaru bisa dipakai mesin rekomendasi

```
1. Admin mendaftarkan panduan BB Padi edisi baru + metadata lisensi.
2. Sistem memecah dokumen menjadi 40 potongan; admin mengisi penanda penyakit/risiko.
3. Reviewer meninjau antrean, menyetujui 36, menolak 4 (2 memuat merek dagang).
4. Reviewer menguji pengambilan: "Blas Daun, fase anakan" → potongan tepat terambil.
5. Versi diaktifkan (persetujuan orang kedua via Modul 08); rekomendasi baru langsung
   memakai rujukan baru.
```

### 10.2 Skenario Edge Case — Dokumen Memuat Dosis

**Aktor**: Domain Reviewer
**Goal**: Konten berisiko tidak pernah dinarasikan ke petani

```
1. Reviewer menemukan potongan berisi dosis pestisida spesifik.
2. Potongan diberi penanda kebijakan "memuat dosis — tidak untuk dinarasikan".
3. Mesin rekomendasi tetap bisa menautkannya sebagai bacaan penyuluh, tetapi tidak
   pernah mengutip angka dosis di kartu petani.
4. Uji keamanan memverifikasi: nol keluaran dosis/merek di sisi petani.
```

---

## 11. Referensi Implementasi

### 11.1 IRRI Rice Knowledge Bank

**URL**: https://www.knowledgebank.irri.org

**Fitur yang Diadaptasi**:
- Struktur konten per penyakit/praktik dengan penanda audiens

### 11.2 Pola kurasi ensiklopedia kolaboratif (versi + diff + persetujuan)

**Fitur yang Diadaptasi**:
- Versi tidak menimpa, tampilan banding antar versi, riwayat persetujuan per entri

---

*Dokumentasi Brief Siaga Padi — Modul: Tata Kelola Pengetahuan | FR: FR-011 | Versi: 1.0.0*
