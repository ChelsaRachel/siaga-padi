import { HomeTile } from './HomeTile'

/** Petani home — Periksa Tanaman (primary) + Riwayat (contract § Roles). */
export function PetaniHome() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <HomeTile
        to="/periksa-tanaman"
        icon="camera"
        title="Periksa Tanaman"
        description="Foto tanaman padi Anda untuk memeriksa hama dan penyakit."
        isPrimary
      />
      <HomeTile
        to="/riwayat"
        icon="clock-counter-clockwise"
        title="Riwayat"
        description="Lihat kembali hasil pemeriksaan tanaman sebelumnya."
      />
    </div>
  )
}
