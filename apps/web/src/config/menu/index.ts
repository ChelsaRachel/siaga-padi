import { APP_MENU } from './app.menu'
import { ADMINISTRATOR_MENU } from './administrator.menu'
import {
  ADMIN_MENU,
  DOMAIN_REVIEWER_MENU,
  PENYULUH_MENU,
  PETANI_MENU,
} from './siaga.menu'

export { APP_MENU } from './app.menu'
export { ADMINISTRATOR_MENU } from './administrator.menu'
export {
  ADMIN_MENU,
  DOMAIN_REVIEWER_MENU,
  PENYULUH_MENU,
  PETANI_MENU,
  menuForRole,
} from './siaga.menu'

/** Flat list of all menus — use for permission checks, global search, etc. */
export const ALL_MENUS = () => [
  ...APP_MENU,
  ...ADMINISTRATOR_MENU,
  ...PETANI_MENU,
  ...PENYULUH_MENU,
  ...ADMIN_MENU,
  ...DOMAIN_REVIEWER_MENU,
]
