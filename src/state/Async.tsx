import type { ReactNode } from 'react'
import { RefreshCw, SearchX, WifiOff } from 'lucide-react'
import type { QueryResult } from './useQuery'

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
        {
}
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
      {
}
      <div className={query.refreshing ? 'is-refreshing' : undefined}>{children(query.data as T)}</div>
    </>
  )
}

export function SkeletonGrid({ count = 4, tall = false }: { count?: number; tall?: boolean }) {
  return (
    <div className="skeleton-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={tall ? 'skeleton-card tall' : 'skeleton-card'} />
      ))}
    </div>
  )
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <span className="skeleton-line" style={{ width }} aria-hidden />
}
