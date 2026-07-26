import { NavLink, useLocation } from 'react-router-dom'
import { menuForRole } from '@/config/menu'
import { selectRole, useAuthStore } from '@/stores/useAuthStore'
import { renderIcon } from '@/utils/icon-renderer'
import { isMenuPathActive } from '@/utils/menu-active'
import { cn } from '@/utils/cn'
import type { IMenu } from '@/types/menu'

/** Bottom nav fits at most 5 one-hand-reachable targets. */
const MAX_BOTTOM_NAV_ITEMS = 5

interface BottomNavItemProps {
  item: IMenu
}

function BottomNavItem({ item }: BottomNavItemProps) {
  const { pathname } = useLocation()
  const isActive = isMenuPathActive(pathname, item.path)
  const iconWeight = isActive
    ? item.additional?.iconStyleActive ?? 'fill'
    : item.additional?.iconStyle ?? 'regular'

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={cn(
        'flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors',
        isActive ? 'text-primary-base' : 'text-font-secondary',
      )}
    >
      {renderIcon({
        icon: item.icon,
        iconType: item.additional?.iconType,
        weight: iconWeight as 'regular' | 'fill',
        className: 'text-h5',
      })}
      <span className={cn('max-w-full truncate text-label-sm leading-tight', isActive && 'font-semibold')}>
        {item.display}
      </span>
    </NavLink>
  )
}

/**
 * Mobile-only bottom navigation bar — the Fusion "Tani Ramah" DESIGN.md
 * mandates one-hand-reachable primary navigation on phones (petani in the
 * field). Renders the same config-driven menu as the desktop sidebar.
 */
export default function AppBottomNav() {
  const role = useAuthStore(selectRole)
  const visibleItems = menuForRole(role)
    .filter((item) => item.show && item.enabled)
    .slice(0, MAX_BOTTOM_NAV_ITEMS)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Navigasi bawah"
      className="flex shrink-0 items-stretch justify-around gap-1 border-t border-border-primary bg-background-primary px-2 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden"
    >
      {visibleItems.map((item) => (
        <BottomNavItem key={item.id} item={item} />
      ))}
    </nav>
  )
}
