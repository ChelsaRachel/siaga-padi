import { HomeTile } from './HomeTile'

/** Admin home — kelola pengguna & konfigurasi (contract § Roles). */
export function AdminHome() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <HomeTile
        to="/administrator/pengguna"
        icon="users"
        title="Pengguna"
        description="Kelola akun petani, penyuluh, dan peninjau."
        isPrimary
      />
      <HomeTile
        to="/administrator/konfigurasi"
        icon="gear-six"
        title="Konfigurasi"
        description="Atur konfigurasi sistem Siaga Padi."
      />
    </div>
  )
}
