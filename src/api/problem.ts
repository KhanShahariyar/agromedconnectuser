

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,

    readonly correlationId?: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }

  get isUnauthenticated() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isTransient() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500
  }
}

interface ProblemDocument {
  status?: number
  code?: string
  detail?: string
  title?: string
  correlationId?: string

  errors?: Record<string, string[]>
}

export async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDocument = {}
  try {
    const text = await response.text()
    if (text) problem = JSON.parse(text) as ProblemDocument
  } catch {

  }

  const fieldErrors = problem.errors
    ? Object.entries(problem.errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('; ')
    : undefined

  return new ApiError(
    response.status,
    problem.code ?? `http_${response.status}`,
    problem.detail ?? fieldErrors ?? problem.title ?? response.statusText ?? 'Something went wrong.',
    problem.correlationId ?? response.headers.get('X-Correlation-Id') ?? undefined,
  )
}

export function networkError(cause: unknown): ApiError {
  return new ApiError(
    0,
    'network_unreachable',
    cause instanceof Error && cause.name === 'AbortError'
      ? 'The request took too long. Check your connection and try again.'
      : 'Could not reach AgroMedConnect. Check your connection and try again.',
  )
}
