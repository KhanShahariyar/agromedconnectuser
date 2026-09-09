import type { ReactNode } from 'react'
import { RefreshCw, SearchX, WifiOff } from 'lucide-react'
import type { QueryResult } from './useQuery'

/**
 * Renders the loading, empty and error states of a query so no screen has to invent its own.
 *
 * The children are a function rather than elements because they must not run until the data is
 * actually there. Written as `<Async …>{list.map(…)}</Async>` the map would evaluate on every
 * render, `undefined` included, and every caller would need its own guard — which is the guard
 * this component exists to remove.
 */
export function Async<T>({
  query,
  children,
  skeleton,
  emptyTitle,
  emptyNote,
  emptyAction,
}: {
  query: QueryResult<T>
  children: (data: T) => ReactNode
  /** Shown while loading. A shape-matched placeholder beats a spinner: the page stops jumping. */
  skeleton?: ReactNode
  emptyTitle: string
  emptyNote?: string
  emptyAction?: ReactNode
}) {
  if (query.status === 'loading') {
    return <>{skeleton ?? <SkeletonGrid count={4} />}</>
  }

  if (query.status === 'error') {
    const error = query.error
    return (
      <div className="async-state" role="alert">
        <WifiOff aria-hidden />
        <b>{error?.isTransient ? 'Could not load this just now' : 'Something went wrong'}</b>
        <p>{error?.detail}</p>
        {/* Retrying a 400 or a 409 produces the same 400 or 409, so the button only appears where
            it can actually help. */}
        {error?.isTransient !== false && (
          <button type="button" onClick={query.reload}>
            <RefreshCw aria-hidden /> Try again
          </button>
        )}
        {error?.correlationId && (
          <small>
            Reference <code>{error.correlationId}</code>
          </small>
        )}
      </div>
    )
  }

  if (query.status === 'empty') {
    return (
      <div className="async-state">
        <SearchX aria-hidden />
        <b>{emptyTitle}</b>
        {emptyNote && <p>{emptyNote}</p>}
        {emptyAction}
      </div>
    )
  }

  return (
    <>
      {/* A reload over existing data dims it rather than replacing it with a skeleton: swapping
          content the user is already reading for placeholders is more disruptive than the wait. */}
      <div className={query.refreshing ? 'is-refreshing' : undefined}>{children(query.data as T)}</div>
    </>
  )
}

/**
 * Placeholder cards sized like the real ones.
 *
 * `aria-hidden` because a screen reader announcing four empty cards is noise; the live region on
 * the loading text is what actually conveys "still loading".
 */
export function SkeletonGrid({ count = 4, tall = false }: { count?: number; tall?: boolean }) {
  return (
    <div className="skeleton-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={tall ? 'skeleton-card tall' : 'skeleton-card'} />
      ))}
    </div>
  )
}

/** A single-line placeholder, for a heading or a stat rather than a grid. */
export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <span className="skeleton-line" style={{ width }} aria-hidden />
}
