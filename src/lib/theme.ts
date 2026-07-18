import { THEME_STORAGE_KEY } from '../types'

export type ThemeId = 'light' | 'dark'

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'dark' || raw === 'light') return raw
  } catch {
    // ignore
  }
  return 'light'
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

export function toggleTheme(current: ThemeId): ThemeId {
  const next: ThemeId = current === 'light' ? 'dark' : 'light'
  applyTheme(next)
  return next
}
