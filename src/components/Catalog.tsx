import { useCallback, useRef, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { Copy } from '../i18n'
import { useDismissable, useStickyHeight } from './hooks'

/** Title block for the catalog. Normal flow, never sticky: it scrolls away. */
export function CatalogHeader({ kicker, title, note }: { kicker: string; title: string; note: string }) {
  return <div className="catalog-head">
    <span className="eyebrow">{kicker}</span>
    <h1>{title}</h1>
    <p>{note}</p>
  </div>
}

export interface ActiveFilter {
  key: string
  label: string
  onRemove: () => void
}

/**
 * The one sticky element on the catalog. It sits at `top: var(--head-h)`,
 * directly under the measured site head, and publishes its own height as
 * --filter-h so the desktop category sidebar can stick beneath it in turn.
 */
export function FilterBar({
  t, tabs, tab, onTab, onOpenCategories, controls, active, onClearAll,
}: {
  t: Copy
  tabs: [string, string][]
  tab: string
  onTab: (id: string) => void
  /** Present only when categories live in the bottom sheet (below 1024px). */
  onOpenCategories?: () => void
  controls: ReactNode
  active: ActiveFilter[]
  onClearAll: () => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  useStickyHeight(barRef, '--filter-h')

  return <div ref={barRef} className="filter-bar">
    <div className="filter-row">
      {onOpenCategories && <button type="button" className="btn btn-ghost cat-toggle" onClick={onOpenCategories}>
        <SlidersHorizontal size={16} aria-hidden/> {t.browse}
      </button>}
      <div className="seg" role="group" aria-label={t.catalog}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => onTab(id)}>{label}</button>
        ))}
      </div>
      <div className="filter-controls">{controls}</div>
    </div>
    {active.length > 0 && <div className="active-filters">
      {active.map((f) => (
        <span key={f.key} className="chip">{f.label}
          <button type="button" onClick={f.onRemove} aria-label={`${t.clear}: ${f.label}`}><X size={14} aria-hidden/></button>
        </span>
      ))}
      <button type="button" className="text-link" onClick={onClearAll}>{t.clear}</button>
    </div>}
  </div>
}

/** Bottom sheet holding the category picker on phones and tablets. */
export function CategorySheet({ t, open, onClose, children }: {
  t: Copy
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const close = useCallback(() => onClose(), [onClose])
  useDismissable(open, close, ref)
  if (!open) return null
  return <>
    <div className="backdrop" onClick={close}/>
    <section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby="category-sheet-title">
      <div className="sheet-head">
        <h2 id="category-sheet-title">{t.browse}</h2>
        <button type="button" className="icon-btn" onClick={close} aria-label={t.close}><X/></button>
      </div>
      <div className="sheet-body">{children}</div>
      <div className="sheet-foot"><button type="button" className="btn btn-primary btn-block" onClick={close}>{t.close}</button></div>
    </section>
  </>
}
