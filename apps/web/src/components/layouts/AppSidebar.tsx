import { NavLink, useLocation } from 'react-router-dom'
import { menuForRole } from '@/config/menu'
import { PerfectScrollArea } from '@/components/wrappers/PerfectScrollArea'
import { selectRole, useAuthStore } from '@/stores/useAuthStore'
import { renderIcon } from '@/utils/icon-renderer'
import { isMenuPathActive } from '@/utils/menu-active'
import { cn } from '@/utils/cn'
import type { IMenu } from '@/types/menu'

interface SidebarNavItemProps {
  item: IMenu
}

function SidebarNavItem({ item }: SidebarNavItemProps) {
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
        'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-body-md transition-colors',
        isActive
          ? 'bg-accent font-semibold text-accent-foreground'
          : 'text-font-secondary hover:bg-muted hover:text-font-primary',
      )}
    >
      {renderIcon({
        icon: item.icon,
        iconType: item.additional?.iconType,
        weight: iconWeight as 'regular' | 'fill',
        className: 'text-h6 shrink-0',
      })}
      <span className="truncate">{item.display}</span>
    </NavLink>
  )
}

/**
 * Desktop navigation column (hidden on mobile — the bottom nav takes over,
 * per the Fusion "Tani Ramah" UX rule). Occupies reserved flex space next to
 * the main column — never overlaps header or content. Items come exclusively
 * from `src/config/menu/*` via `menuForRole`.
 */
export default function AppSidebar() {
  const role = useAuthStore(selectRole)
  const visibleItems = menuForRole(role).filter((item) => item.show && item.enabled)

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border-primary bg-background-secondary md:flex">
      <div className="relative min-h-0 flex-1">
        <PerfectScrollArea className="h-full max-h-full">
          <nav aria-label="Navigasi utama" className="flex flex-col gap-1 p-3">
            {visibleItems.map((item) => (
              <SidebarNavItem key={item.id} item={item} />
            ))}
          </nav>
        </PerfectScrollArea>
      </div>
    </aside>
  )
}
