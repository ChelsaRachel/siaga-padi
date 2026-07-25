# Modul Umpan Balik dan Dataset

> Sumber otoritatif: FRD `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — FR-012 (Feedback dan Dataset Candidate Queue). Prioritas Should (MVP Extended); UI boleh minimal. Jika ada perbedaan, FRD yang berlaku.

## 1. Gambaran Umum

Koreksi penyuluh di lapangan adalah bahan belajar paling berharga untuk model — tetapi tidak boleh langsung mencemari data latih. Modul ini mengubah koreksi berizin menjadi **kandidat dataset** yang melewati de-identifikasi, deteksi duplikat, dan persetujuan domain reviewer sebelum masuk dataset riset berversi. Tidak ada pelatihan otomatis dari umpan balik produksi; setiap rilis dataset punya manifes yang tidak bisa diubah.

### 1.1 Tujuan Modul

| Tujuan | Deskripsi |
|--------|-----------|
| Belajar dari lapangan, aman | Koreksi tervalidasi menjadi kandidat data — hanya jika consent riset ada |
| Tanpa cemaran diam-diam | Tidak ada pelatihan otomatis; semua kandidat lewat kurasi manusia |
| Privasi terjaga | Identitas, telepon, koordinat persis dihapus dari aset riset; kelompok lahan/perangkat disamarkan |
| Dataset tertelusur | Rilis berversi dengan manifes: sumber, distribusi, pengecualian |

### 1.2 Target Pengguna

| Pengguna | Kebutuhan |
|----------|-----------|
| Pemilik data/CV (Chelsa) | Memeriksa kualitas kandidat dan membangun rilis dataset |
| Domain Reviewer | Menyetujui/menolak/melabel ulang kandidat; mengadili label yang diperdebatkan |

---

## 2. Fitur Utama

### 2.1 Antrean Kandidat

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Daftar kandidat | Tabel daftar dengan filter | Asal (koreksi review/sistem), consent, label, kualitas, kelompok samaran | Harian |
| Peringatan duplikat | Indikator ikon + panel perbandingan | Kandidat mirip/duplikat dengan yang sudah ada | Saat terdeteksi |

**Interaksi**: filter per label/status/asal; buka kandidat untuk tinjau.

### 2.2 Tinjauan Gambar dan Label

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Panel gambar + label | Galeri + panel keputusan | Gambar ter-de-identifikasi, label AI vs label koreksi, riwayat reviewer | Manual |
| Tombol keputusan | Setujui / Tolak / Label Ulang / Sengketa | — | Manual |

**Interaksi**: label ambigu wajib peninjau kedua; kandidat sengketa berstatus "diperdebatkan" dan tidak pernah masuk pelatihan sampai diadili.

### 2.3 Pembangun Rilis Dataset

**Komponen Visual**:

| Komponen | Tipe | Data | Update |
|----------|------|------|--------|
| Ringkasan rilis | Kartu ringkasan + tabel distribusi | Jumlah per kelas, sebaran kelompok, pengecualian | Saat disusun |
| Manifes rilis | Tampilan dokumen | Versi, lisensi, sumber, pengecualian — terkunci setelah rilis | Per rilis |

**Interaksi**: susun rilis dari kandidat disetujui → manifes final terkunci; pelatihan hanya membaca manifes.

---

## 3. Navigasi & Interaksi

### 3.1 Peta Navigasi

| Dari Layar / Komponen | User Klik / Aksi | Menuju Ke | Context yang Dibawa |
|----------------------|------------------|-----------|---------------------|
| Menu admin/data | "Antrean Dataset" | Antrean Kandidat (2.1) | Filter default: menunggu tinjau |
| Antrean kandidat | Klik baris | Tinjauan Gambar & Label (2.2) | ID kandidat |
| Peringatan duplikat | "Bandingkan" | Panel perbandingan dua gambar | Kedua ID |
| Antrean (disetujui) | "Susun Rilis" | Pembangun Rilis (2.3) | Kandidat terpilih |
| Modul 04 (koreksi + consent) | Otomatis | Kandidat baru di antrean (2.1) | Tautan kasus (bukan salinan publik) |

### 3.2 Decision Branch

- **Consent riset tidak ada** → hanya umpan balik agregat dicatat; gambar tidak pernah masuk antrean
- **Duplikat terdeteksi** → tinjau perbandingan; tolak atau tandai varian
- **Label diperdebatkan** → status sengketa → adjudikasi peninjau kedua sebelum keputusan

### 3.3 Navigasi Masuk dari Modul Lain

- Dari Modul `04`: koreksi tersimpan dengan consent → nominasi otomatis ke antrean ini

---

## 4. Alur Bisnis

### 4.1 Alur Kandidat Sampai Dataset (Happy Path)

```
┌───────────────┐  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐
│ Koreksi review│─▶│ De-identifikasi│─▶│ Deteksi      │─▶│ Kurasi: pemilik │
│ + consent     │  │ → aset riset   │  │ duplikat     │  │ data cek        │
│ (Modul 04)    │  │ tanpa identitas│  └──────────────┘  │ kualitas, domain│
└───────────────┘  └────────────────┘                    │ reviewer setujui│
                                                         └────────┬────────┘
                                                                  ▼
                                                      ┌──────────────────────┐
                                                      │ Staging → rilis      │
                                                      │ berversi dengan      │
                                                      │ manifes terkunci     │
                                                      └──────────────────────┘
```

**Penjelasan:** Sistem membuat tautan kandidat, bukan salinan publik. Kelompok lahan/perangkat/tanggal dipertahankan dalam bentuk samaran agar pembagian data latih/uji tidak bocor antar kelompok.

### 4.2 Alur Adjudikasi Label

1. Dua reviewer berbeda pendapat atas label kandidat.
2. Status "diperdebatkan"; kandidat keluar dari calon rilis.
3. Peninjau ketiga/forum kecil memutuskan; keputusan + alasan tercatat.

### 4.3 Alur Edge Case — Consent Dicabut Setelah Nominasi

```
┌───────────────────┐   ┌──────────────────────┐   ┌────────────────────────────┐
│ Petani mencabut   │──▶│ Kandidat terkait     │──▶│ Kandidat ditarik dari      │
│ consent riset     │   │ teridentifikasi      │   │ antrean/staging; rilis     │
│ (Modul 01)        │   │ lewat tautan kasus   │   │ lama dicatat pengecualian  │
└───────────────────┘   └──────────────────────┘   │ di manifes rilis berikutnya│
                                                   └────────────────────────────┘
```

**Penjelasan:** Manifes rilis tidak bisa diubah, maka pencabutan dicatat sebagai pengecualian pada rilis berikutnya dan aset ditarik dari penggunaan aktif.

---

## 5. Data yang Dikelola Modul

### 5.1 Entity Bisnis Utama

**Kandidat Dataset**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| ID kandidat | Identitas unik | KD-2026-0045 |
| Asal | Koreksi review / nominasi sistem | Koreksi review |
| Consent | Status izin riset | Ya |
| Label | Label AI vs label koreksi + reviewer | AI: Tidak Yakin → Manusia: Bercak Cokelat |
| Kualitas | Penilaian kelayakan gambar | Layak |
| Kelompok samaran | Lahan/perangkat/tanggal bentuk samaran | L-07 / P-12 / 2026-W30 |
| Status | Menunggu / disetujui / ditolak / diperdebatkan | Disetujui |

**Rilis Dataset**

| Field | Deskripsi | Contoh Nilai |
|-------|-----------|---------------|
| Versi rilis | Penomoran rilis | DS-v0.3 |
| Manifes | Sumber, distribusi kelas, lisensi, pengecualian | (dokumen terkunci) |

### 5.2 Sample Data

| ID | Asal | Label Akhir | Status | Kelompok |
|---|---|---|---|---|
| KD-2026-0045 | Koreksi review | Bercak Cokelat | Disetujui | L-07/P-12 |
| KD-2026-0046 | Koreksi review | Blas Daun | Diperdebatkan | L-03/P-05 |
| KD-2026-0047 | Nominasi sistem | Hawar Daun Bakteri | Ditolak (duplikat) | L-07/P-12 |

### 5.3 Catatan untuk Tim Downstream

- Tidak ada pelatihan otomatis dari umpan balik produksi — jalur satu-satunya adalah rilis berversi.
- Identitas, telepon, koordinat persis wajib hilang dari aset riset; verifikasi de-identifikasi sebelum staging.
- Pembagian latih/uji harus menghormati kelompok samaran (anti-kebocoran antar lahan/perangkat/tanggal).

---

## 6. Kebutuhan Data Eksternal

*Di-skip — seluruh kandidat berasal dari internal (kasus + koreksi review).*

## 7. Stack Agent Modul

*Di-skip — de-identifikasi dan deteksi duplikat adalah pekerjaan terjadwal sistem; keputusan tetap manusia.*

## 8. Konfigurasi Alert

*Di-skip — antrean ditinjau berkala; tidak ada alerting threshold.*

---

## 9. Standar Layanan yang Diharapkan

| Aspek | Standar Diharapkan |
|-------|---------------------|
| Navigasi antrean & tinjauan | Sedang |
| Pemrosesan de-identifikasi | Toleran — pekerjaan latar |
| Frekuensi | Harian (batch); bukan jalur waktu-nyata |
| Ketersediaan | Jam kerja — modul internal riset |

---

## 10. Use Case Scenarios

### 10.1 Skenario Kurasi Mingguan

**Aktor**: Pemilik data/CV
**Goal**: Menambah kandidat berkualitas ke staging

```
1. Pemilik data membuka antrean: 23 kandidat baru minggu ini.
2. 3 duplikat terdeteksi → dibandingkan → 2 ditolak, 1 varian diterima.
3. Domain reviewer menyetujui 17, melabel ulang 2, menyengketakan 1.
4. Kandidat disetujui masuk staging; ringkasan distribusi kelas diperbarui.
5. Saat cukup, rilis DS-v0.3 disusun dengan manifes terkunci.
```

### 10.2 Skenario Edge Case — Label Diperdebatkan

**Aktor**: Domain Reviewer
**Goal**: Data ambigu tidak merusak dataset

```
1. Dua reviewer memberi label berbeda pada gambar gejala campuran.
2. Status "diperdebatkan"; kandidat keluar dari calon rilis.
3. Adjudikasi: diputuskan "Lainnya/Tidak Diketahui" — tidak dipakai untuk pelatihan
   kelas utama, disimpan untuk evaluasi ketahanan model.
```

---

## 11. Referensi Implementasi

### 11.1 Pola kurasi dataset penelitian ML (manifes berversi)

**Fitur yang Diadaptasi**:
- Rilis dataset dengan manifes tidak bisa diubah + pencatatan pengecualian antar rilis

### 11.2 Pola platform anotasi gambar (antrean + adjudikasi)

**Fitur yang Diadaptasi**:
- Antrean tinjauan label dengan jalur sengketa dan peninjau kedua

---

*Dokumentasi Brief Siaga Padi — Modul: Umpan Balik dan Dataset | FR: FR-012 | Versi: 1.0.0*
