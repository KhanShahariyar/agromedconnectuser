import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/problem'

/**
 * The four states any remote read can be in.
 *
 * `empty` is separate from `ready` on purpose. "We asked and there is nothing" and "here are your
 * results" want different screens — a shop with no matching products should offer to clear the
 * filters, not render an unexplained blank grid — and a component that only checks `loading` and
 * `error` will show that blank grid every time.
 */
export type QueryStatus = 'loading' | 'error' | 'empty' | 'ready'

export interface QueryResult<T> {
  status: QueryStatus
  data: T | undefined
  error: ApiError | undefined
  /** Re-runs the query. Bound to the retry button in the error state. */
  reload: () => void
  /** True while a reload is in flight over data that is already on screen. */
  refreshing: boolean
}

interface Options<T> {
  /**
   * Decides whether a successful result counts as empty. Defaults to "an empty array".
   *
   * Worth overriding for wrapped collections — a cart with zero items arrives as an object, and
   * the default would call it `ready`.
   */
  isEmpty?: (data: T) => boolean
  /** Skips the request entirely; useful for a query that needs a signed-in user. */
  enabled?: boolean
}

function defaultIsEmpty(data: unknown) {
  return Array.isArray(data) && data.length === 0
}

/**
 * Runs an async read and tracks its state, cancelling work that is no longer wanted.
 *
 * ## Why the abort controller is not optional
 *
 * Type three characters into the search box and three requests are in flight. They can finish in
 * any order, so without cancellation the results for "pes" can arrive after the results for
 * "pesticide" and overwrite them — the classic stale-response bug, and one that only shows up on
 * exactly the slow connections this site's users are most likely to have. Every run aborts the one
 * before it, and a result whose controller was aborted is dropped rather than committed.
 *
 * ## Why the deps are a string
 *
 * A dependency array of objects re-runs on every render, because `{}` never equals `{}`. Callers
 * pass a key they build themselves — `['search', text, categoryId].join('|')` — which makes the
 * identity of a query explicit and greppable instead of an accident of referential equality.
 */
export function useQuery<T>(
  key: string,
  run: (signal: AbortSignal) => Promise<T>,
  options: Options<T> = {},
): QueryResult<T> {
  const { isEmpty = defaultIsEmpty, enabled = true } = options

  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<ApiError | undefined>(undefined)
  const [loading, setLoading] = useState(enabled)
  const [nonce, setNonce] = useState(0)

  // Held in a ref so `execute` does not change identity when the callback does, which would
  // re-trigger the effect on every render of the parent.
  const runRef = useRef(run)
  runRef.current = run

  const hasData = data !== undefined

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    runRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setError(undefined)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        // An aborted fetch surfaces as a network error here; it is a cancellation, not a failure,
        // and showing "could not reach AgroMedConnect" for it would be a lie.
        if (cause instanceof ApiError && cause.code === 'network_unreachable' && controller.signal.aborted) return
        setError(cause instanceof ApiError ? cause : new ApiError(0, 'unknown', String(cause)))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [key, nonce, enabled])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const status: QueryStatus =
    loading && !hasData ? 'loading'
      : error && !hasData ? 'error'
        : hasData && isEmpty(data as T) ? 'empty'
          : hasData ? 'ready'
            : 'loading'

  return { status, data, error, reload, refreshing: loading && hasData }
}
