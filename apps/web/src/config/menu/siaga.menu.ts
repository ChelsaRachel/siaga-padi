import type { IMenu, IMenuAdditional } from '@/types/menu'
import type { SiagaRole } from '@/types/siaga-auth'

/**
 * Role-scoped navigation for Siaga Padi (Sprint 01).
 * The shell (sidebar + mobile bottom nav) renders `menuForRole(role)` —
 * navigation is config-driven, NEVER hardcoded in layout components.
 *
 * Paths for future sprints are wired as routes-to-be: they exist in
 * `src/routes/` and render a "hadir di sprint berikutnya" empty state.
 */

const DEFAULT_ADDITIONAL: IMenuAdditional = {
  container: 'full',
  iconType: 'phosphor',
  iconStyle: 'regular',
  iconStyleActive: 'fill',
  mainPage: false,
  redirectToEnabled: false,
  redirectTo: '',
}

function createMenuItem(entry: {
  id: string
  display: string
  name: string
  path: string
  icon: string
  isMainPage?: boolean
  description?: string
}): IMenu {
  return {
    id: entry.id,
    idParent: '',
    display: entry.display,
    name: entry.name,
    path: entry.path,
    show: true,
    search: true,
    enabled: true,
    group: 'application',
    type: 'menu',
    icon: entry.icon,
    seo: { title: entry.display, description: entry.description ?? '' },
    privileges: null,
    additional: { ...DEFAULT_ADDITIONAL, mainPage: entry.isMainPage ?? false },
  }
}

export const PETANI_MENU: IMenu[] = [
  createMenuItem({ id: 'sphome1', display: 'Beranda', name: 'beranda', path: '/', icon: 'house', isMainPage: true }),
  createMenuItem({ id: 'spprks2', display: 'Periksa Tanaman', name: 'periksa-tanaman', path: '/periksa-tanaman', icon: 'camera' }),
  createMenuItem({ id: 'sprwyt3', display: 'Riwayat', name: 'riwayat', path: '/riwayat', icon: 'clock-counter-clockwise' }),
  createMenuItem({
    id: 'spprfl4',
    display: 'Profil',
    name: 'profil',
    path: '/profil',
    icon: 'user-circle',
    description: 'Data diri, izin, dan daftar lahan',
  }),
]

export const PENYULUH_MENU: IMenu[] = [
  createMenuItem({ id: 'pyhome1', display: 'Beranda', name: 'beranda', path: '/', icon: 'house', isMainPage: true }),
  createMenuItem({ id: 'pyantr2', display: 'Antrean Review', name: 'antrean-review', path: '/antrean-review', icon: 'list-checks' }),
  createMenuItem({ id: 'pydmpg3', display: 'Dampingi Petani', name: 'dampingi-petani', path: '/dampingi-petani', icon: 'handshake' }),
  createMenuItem({ id: 'pyrwil4', display: 'Riwayat Wilayah', name: 'riwayat-wilayah', path: '/riwayat-wilayah', icon: 'map-trifold' }),
]

export const ADMIN_MENU: IMenu[] = [
  createMenuItem({ id: 'adhome1', display: 'Beranda', name: 'beranda', path: '/', icon: 'house', isMainPage: true }),
  createMenuItem({ id: 'adpgna2', display: 'Pengguna', name: 'pengguna', path: '/administrator/pengguna', icon: 'users' }),
  createMenuItem({ id: 'adkonf3', display: 'Konfigurasi', name: 'konfigurasi', path: '/administrator/konfigurasi', icon: 'gear-six' }),
]

export const DOMAIN_REVIEWER_MENU: IMenu[] = [
  createMenuItem({ id: 'drhome1', display: 'Beranda', name: 'beranda', path: '/', icon: 'house', isMainPage: true }),
  createMenuItem({
    id: 'drpngt2',
    display: 'Pengetahuan',
    name: 'pengetahuan',
    path: '/pengetahuan',
    icon: 'books',
    description: 'Sumber rujukan & basis pengetahuan',
  }),
]

const MENU_BY_ROLE: Record<SiagaRole, IMenu[]> = {
  petani: PETANI_MENU,
  penyuluh: PENYULUH_MENU,
  admin: ADMIN_MENU,
  domain_reviewer: DOMAIN_REVIEWER_MENU,
}

/** Single source the shell uses to render navigation for the active role. */
export function menuForRole(role: SiagaRole | null | undefined): IMenu[] {
  return role ? MENU_BY_ROLE[role] : []
}
