import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme: Theme) => {
        set({ theme })
        updateDocumentTheme(theme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) updateDocumentTheme(state.theme)
      },
    }
  )
)

function updateDocumentTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
    return
  }

  root.classList.add(theme)
}

// Initial hydration without Zustand persist on server if SSR, but safe for React SPA
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('theme-storage')
  if (!stored) {
    updateDocumentTheme('system')
  }
}
