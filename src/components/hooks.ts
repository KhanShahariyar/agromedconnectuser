import { useEffect, useState, type RefObject } from 'react'

/**
 * Publishes an element's rendered height as a CSS custom property on <html>.
 *
 * Sticky offsets used to be hardcoded (`top:84px`, then `68px` once the header
 * shrank), so anything stuck below the header drifted whenever its height
 * changed: a wrapped nav, a font swap, a different language. Measuring the real
 * box keeps every `top: var(--head-h)` exact at every width.
 */
export function useStickyHeight(ref: RefObject<HTMLElement | null>, cssVar: '--head-h' | '--filter-h') {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty(cssVar, `${Math.round(el.getBoundingClientRect().height)}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty(cssVar)
    }
  }, [ref, cssVar])
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/**
 * Shared behaviour for drawers, sheets and popovers: Escape closes, the page
 * behind stops scrolling (modal only), focus moves into the panel and returns
 * to whatever opened it.
 */
export function useDismissable(
  open: boolean,
  onClose: () => void,
  panel: RefObject<HTMLElement | null>,
  { modal = true }: { modal?: boolean } = {},
) {
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onPointer = (e: PointerEvent) => {
      if (!modal && panel.current && !panel.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    const prevOverflow = document.body.style.overflow
    if (modal) {
      document.body.style.overflow = 'hidden'
      panel.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      if (modal) {
        document.body.style.overflow = prevOverflow
        opener?.focus?.()
      }
    }
  }, [open, onClose, panel, modal])
}
