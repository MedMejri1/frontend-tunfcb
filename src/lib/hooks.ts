import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** Filters stored in the URL so the back button and links keep them. */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, params.get(key) ?? fallback]),
  ) as T

  const set = (patch: Partial<T>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === '' || value === defaults[key]) next.delete(key)
          else next.set(key, String(value))
        }
        // Any filter change other than the page itself goes back to page 1.
        if (!('page' in patch)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  return [values, set] as const
}
