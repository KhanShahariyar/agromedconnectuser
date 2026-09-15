import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/problem'

export type QueryStatus = 'loading' | 'error' | 'empty' | 'ready'

export interface QueryResult<T> {
  status: QueryStatus
  data: T | undefined
  error: ApiError | undefined

  reload: () => void

  refreshing: boolean
}

interface Options<T> {

  isEmpty?: (data: T) => boolean

  enabled?: boolean
}

function defaultIsEmpty(data: unknown) {
  return Array.isArray(data) && data.length === 0
}

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
