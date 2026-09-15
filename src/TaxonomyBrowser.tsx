import { useEffect, useState } from 'react'
import * as api from './api/endpoints'
import type { Category } from './api/contracts'

export interface TaxonomySelection {
  divisionId: string
  divisionName: string
  categoryId: string
  categoryName: string
  subcategoryId: string
  subcategoryName: string
}

export const emptySelection: TaxonomySelection = {
  divisionId: '', divisionName: '',
  categoryId: '', categoryName: '',
  subcategoryId: '', subcategoryName: '',
}

export const deepestLabel = (s: TaxonomySelection) =>
  s.subcategoryName || s.categoryName || s.divisionName || ''

export const hasSelection = (s: TaxonomySelection) =>
  Boolean(s.divisionId || s.categoryId || s.subcategoryId)

/**
 * A glyph per category, chosen from the server's `icon` where there is one and
 * otherwise from the code. Cosmetic only — it never decides what is shown, so a
 * category the app has never heard of still gets a sensible leaf.
 */
function glyphFor(c: Category): string {
  const key = (c as Category & { icon?: string }).icon ?? c.code
  // Specific topic first, species last. Ordered the other way round, every
  // code under cattle-* matched "cattle" and the whole tier drew the same cow.
  const table: [RegExp, string][] = [
    [/deworm|parasite/, '🪱'], [/vitamin|mineral|premix/, '💊'],
    [/antibiotic|therapeut/, '💉'], [/disinfect|biosecur/, '🧴'],
    [/electrolyte|hydrat|water-quality|water-condition/, '💧'],
    [/growth|performance|promot/, '📈'], [/respirat/, '🌬️'],
    [/liver|kidney|metabol|digest/, '🫀'], [/milk|dairy/, '🥛'],
    [/calf|fry|fingerling/, '🍼'], [/reproduct/, '💞'],
    [/egg|layer/, '🥚'], [/broiler/, '🍗'],
    [/equipment|tool/, '🧰'], [/probiotic|enzyme/, '🧫'], [/stress/, '🧘'],
    [/pond/, '🪷'], [/feed|fodder|forage|nutrition|supplement/, '🌿'],
    [/vegetable/, '🥬'], [/fruit/, '🍎'], [/oilseed/, '🌻'], [/spice/, '🌶️'],
    [/rice|paddy/, '🌾'], [/wheat/, '🌾'], [/maize/, '🌽'], [/pulse/, '🫘'],
    [/advis|soil|service/, '🛠️'], [/medicine|treat/, '💊'],
    // species and division fallbacks, only if nothing more specific matched
    [/poultry|chicken/, '🐔'], [/cattle|cow/, '🐄'], [/fish|aqua/, '🐟'],
    [/seed|crop/, '🌾'], [/animal/, '🐮'],
  ]
  for (const [re, glyph] of table) if (re.test(key)) return glyph
  return '🌱'
}

/**
 * Browse the taxonomy by walking into it.
 *
 * The previous version stacked up to three rows of identical pills, so every
 * tier looked the same weight and nothing signalled that picking one opened
 * another. Here each step replaces the last: a trail you can step back through,
 * and tiles large enough to hit on a phone, each showing where it leads.
 *
 * One tier is fetched at a time, so opening Fish never downloads Animal's 26
 * subcategories, and a category a superadmin adds appears on the next request.
 */
export function TaxonomyBrowser({
  value,
  onChange,
  allLabel,
  locale,
}: {
  value: TaxonomySelection
  onChange: (next: TaxonomySelection) => void
  allLabel: string
  locale: string
}) {
  const [divisions, setDivisions] = useState<Category[]>([])
  const [children, setChildren] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Which tier is on screen: the one below whatever is currently selected.
  const openParent = value.categoryId || value.divisionId || ''
  const atRoot = !openParent

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    api.getCategoryTier({ level: 1 }, ac.signal)
      .then(setDivisions).catch(() => {}).finally(() => setLoading(false))
    return () => ac.abort()
  }, [locale])

  // Arriving from a shared link gives ids and no names; one call fills the trail.
  const deepest = value.subcategoryId || value.categoryId || value.divisionId
  const namesMissing = Boolean(deepest) && !deepestLabel(value)
  useEffect(() => {
    if (!namesMissing || !deepest) return
    const ac = new AbortController()
    api.getCategoryBreadcrumb(deepest, ac.signal)
      .then((chain) => onChange({
        divisionId: chain[0]?.id ?? '', divisionName: chain[0]?.name ?? '',
        categoryId: chain[1]?.id ?? '', categoryName: chain[1]?.name ?? '',
        subcategoryId: chain[2]?.id ?? '', subcategoryName: chain[2]?.name ?? '',
      }))
      .catch(() => onChange(emptySelection))
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesMissing, deepest, locale])

  useEffect(() => {
    if (!openParent) { setChildren([]); return }
    const ac = new AbortController()
    setLoading(true)
    api.getCategoryTier({ parentId: openParent }, ac.signal)
      .then(setChildren).catch(() => setChildren([])).finally(() => setLoading(false))
    return () => ac.abort()
  }, [openParent, locale])

  const pick = (c: Category) => {
    if (atRoot) onChange({ ...emptySelection, divisionId: c.id, divisionName: c.name })
    else if (!value.categoryId) {
      onChange({
        divisionId: value.divisionId, divisionName: value.divisionName,
        categoryId: c.id, categoryName: c.name, subcategoryId: '', subcategoryName: '',
      })
    } else {
      onChange({ ...value, subcategoryId: c.id, subcategoryName: c.name })
    }
  }

  const upToRoot = () => onChange(emptySelection)
  const upToDivision = () => onChange({
    ...emptySelection, divisionId: value.divisionId, divisionName: value.divisionName,
  })
  const back = () => {
    if (value.subcategoryId || value.categoryId) upToDivision()
    else upToRoot()
  }

  const tiles = atRoot ? divisions : children
  // A tier with nothing under it is a complete answer, not a dead end, so the
  // grid is simply not drawn rather than announcing an absence.
  const showGrid = loading || tiles.length > 0

  return (
    <div className="cat-browser">
      {hasSelection(value) && (
        <nav className="cat-trail" aria-label="Category trail">
          <button type="button" className="back" onClick={back}>← Back</button>
          <button type="button" onClick={upToRoot}>{allLabel}</button>
          <span className="sep" aria-hidden>›</span>
          <button
            type="button"
            className={value.categoryId ? '' : 'now'}
            onClick={upToDivision}
          >{value.divisionName || '…'}</button>
          {value.categoryId && (
            <>
              <span className="sep" aria-hidden>›</span>
              <button
                type="button"
                className={value.subcategoryId ? '' : 'now'}
                onClick={() => onChange({ ...value, subcategoryId: '', subcategoryName: '' })}
              >{value.categoryName}</button>
            </>
          )}
          {value.subcategoryId && (
            <>
              <span className="sep" aria-hidden>›</span>
              <span className="now">{value.subcategoryName}</span>
            </>
          )}
        </nav>
      )}

      {showGrid && (
        <div className="cat-grid" aria-busy={loading}>
          {loading && tiles.length === 0
            ? Array.from({ length: 4 }, (_, i) => <div key={i} className="cat-skeleton" />)
            : tiles.map((c) => {
                const selected = c.id === value.subcategoryId
                  || (c.id === value.categoryId && !value.subcategoryId)
                  || (c.id === value.divisionId && !value.categoryId)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={selected ? 'cat-tile on' : 'cat-tile'}
                    onClick={() => pick(c)}
                  >
                    <span className="cat-glyph" aria-hidden>{glyphFor(c)}</span>
                    <span className="cat-name">{c.name}</span>
                    <span className="arrow" aria-hidden>›</span>
                  </button>
                )
              })}
        </div>
      )}
    </div>
  )
}
