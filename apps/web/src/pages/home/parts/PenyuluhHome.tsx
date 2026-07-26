import { HomeTile } from './HomeTile'

/** Penyuluh home — antrean review + dampingi petani (contract § Roles). */
export function PenyuluhHome() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <HomeTile
        to="/antrean-review"
        icon="list-checks"
        title="Antrean Review"
        description="Tinjau laporan pemeriksaan dari petani di wilayah binaan Anda."
        isPrimary
      />
      <HomeTile
        to="/dampingi-petani"
        icon="handshake"
        title="Dampingi Petani"
        description="Bertindak atas nama petani binaan yang membutuhkan bantuan."
      />
      <HomeTile
        to="/riwayat-wilayah"
        icon="map-trifold"
        title="Riwayat Wilayah"
        description="Pantau riwayat kasus di seluruh wilayah binaan."
      />
    </div>
  )
}
