import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useThemeStore } from '@/stores/useThemeStore'
import { useAuthStore } from '@/stores/useAuthStore'

interface UserDropdownProps {
  /** 'bottom' for top-bar (opens downward), 'top' for sidebar footer (opens upward) */
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
}

export function UserDropdown({ side = 'bottom', align = 'end' }: UserDropdownProps) {
  const { theme, setTheme } = useThemeStore()
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const { user, clearAuth } = useAuthStore()

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.username ?? 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-background-secondary transition-colors outline-none">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className=" font-semibold text-font-primary leading-none">{displayName}</span>
            <span className="text-label-sm text-font-secondary leading-none">{user?.email ?? ''}</span>
          </div>
          <Avatar className="size-8 rounded-lg shrink-0">
            <AvatarImage src={user?.avatar} alt={displayName} />
            <AvatarFallback className="rounded-lg bg-primary text-white text-label-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <i className="ph ph-caret-up-down text-font-secondary hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" align={align} side={side} sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-3 py-2">
            <Avatar className="size-8 rounded-lg shrink-0">
              <AvatarImage src={user?.avatar} alt={displayName} />
              <AvatarFallback className="rounded-lg bg-primary text-white text-label-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className=" font-semibold text-font-primary truncate">{displayName}</span>
              <span className="text-label-sm text-font-secondary truncate">{user?.email ?? ''}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={toggleTheme} className="gap-2 ">
            <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'} text-base text-font-secondary`} />
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 ">
            <i className="ph ph-user text-base text-font-secondary" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 ">
            <i className="ph ph-gear text-base text-font-secondary" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={clearAuth} className="gap-2  text-error">
          <i className="ph ph-sign-out text-base" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
