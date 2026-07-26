/** Shared active-state rule for menu paths (sidebar + bottom nav). */
export function isMenuPathActive(currentPathname: string, menuPath: string): boolean {
  if (menuPath === '/') {
    return currentPathname === '/'
  }
  return currentPathname === menuPath || currentPathname.startsWith(`${menuPath}/`)
}
