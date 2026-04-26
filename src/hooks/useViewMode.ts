import { useState } from 'react'

export type ViewMode = 'simple' | 'advanced'

export function useViewMode(storageKey: string): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'simple'
    return (window.localStorage.getItem(storageKey) as ViewMode) || 'simple'
  })
  const update = (m: ViewMode) => {
    setMode(m)
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, m)
  }
  return [mode, update]
}
