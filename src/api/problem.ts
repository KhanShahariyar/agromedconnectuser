/**
 * RFC 9457 problem documents, and the one error type the rest of the app catches.
 */

/**
 * A failure the API described, or one the network handed us instead.
 *
 * `code` is the field to branch on. It is a stable machine string — `refresh_token_invalid`,
 * `insufficient_stock` — that does not change when the response language does, whereas `detail` is
 * prose written for whichever locale was negotiated and will be Bengali as often as not. Branching
 * on `detail` produces code that works in English and silently stops working in Bengali.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    /** Quote this in a support request; it ties the failure to a line in the server log. */
    readonly correlationId?: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }

  /** True when signing in again is the only way forward. */
  get isUnauthenticated() {
    return this.status === 401
  }

  /** True when the caller is signed in but not allowed to do this. */
  get isForbidden() {
    return this.status === 403
  }

  /**
   * True when retrying might work: a transport failure, a timeout, a rate limit, or a server
   * fault. A 400 or a 409 is a statement about the request and will fail identically forever.
   */
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
  /** Model-binding failures arrive as a field map rather than a single detail string. */
  errors?: Record<string, string[]>
}

/**
 * Turns any failed response into an {@link ApiError}.
 *
 * The body is parsed defensively because the failures that matter most are exactly the ones that
 * do not produce a well-formed problem document: a proxy returning an HTML error page, a 502 with
 * an empty body, a connection cut mid-response. Those must still arrive as a typed error carrying
 * the status, not as a `SyntaxError` from `JSON.parse` thrown at whatever component happened to be
 * rendering.
 */
export async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDocument = {}
  try {
    const text = await response.text()
    if (text) problem = JSON.parse(text) as ProblemDocument
  } catch {
    // Left as {} — the status line below still says something true.
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

/**
 * The error for a request that never reached the server.
 *
 * Status 0 is not an HTTP status — it is the conventional stand-in for "no response arrived", and
 * it is what {@link ApiError.isTransient} keys off so an offline browser retries rather than
 * telling the user their request was rejected.
 */
export function networkError(cause: unknown): ApiError {
  return new ApiError(
    0,
    'network_unreachable',
    cause instanceof Error && cause.name === 'AbortError'
      ? 'The request took too long. Check your connection and try again.'
      : 'Could not reach AgroMedConnect. Check your connection and try again.',
  )
}
