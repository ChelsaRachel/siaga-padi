# Sprint 07 — Offline & Fallback

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Tidak ada pekerjaan pengguna yang hilang saat offline (draf/foto tersimpan lokal 7 hari, sinkron otomatis anti-duplikat) dan tidak ada kegagalan diam-diam; AI bahasa gagal → rekomendasi templat aturan bertanda "mode terbatas"; analisis gambar mati → simpan + antre review tanpa label — brief [`09_MODE_OFFLINE_FALLBACK.md`](../../../brief/09_MODE_OFFLINE_FALLBACK.md) (FR-014).

## Acceptance

- Offline penuh: kasus + foto dibuat tanpa sinyal, banner + penghitung tertunda tampil; online kembali → sinkron otomatis, alur normal lanjut, tanpa duplikat.
- Item gagal melewati batas percobaan → diarsip "gagal" tetap terlihat + coba ulang manual; konflik server disimpan utuh untuk ditinjau, tidak ditimpa diam-diam.
- AI bahasa gagal → kartu hasil dari templat konten tervalidasi + badge "mode terbatas"; saat pulih kasus bisa diproses ulang penuh.
- Panel backlog admin menampilkan antrean tertunda agregat + tingkat kegagalan per menit.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce — sinkronisasi dan fallback adalah mekanisme sistem deterministik. `be_service` + `fe_shell`.

## Cross-stack dependencies

No new schema foundation — reuses Sprint 02/03 idempotency contracts and Sprint 05's fallback seam. **Penting:** sebagian mekanisme sisi web sudah ada di branch `feat/offline-pwa-support` (antrean opt-in, batas percobaan, penyimpanan konflik, banner status) — tinjau dan integrasikan, jangan tulis ulang (brief 09 §5.3).

## Dependency graph

```
backend/01-sync-idempotency.md ──▶ frontend/01-offline-queue-ui.md
backend/02-rule-fallback.md    ──▶ frontend/02-limited-mode-ui.md
backend/03-backlog-metrics.md  ──▶ frontend/03-admin-backlog-panel.md
```

## Notes

- "Perangkat bersama" dipilih saat login → draf lokal dihapus saat keluar.

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/09_MODE_OFFLINE_FALLBACK.md`](../../../brief/09_MODE_OFFLINE_FALLBACK.md)
