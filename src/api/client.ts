import { ApiError, networkError, toApiError } from './problem'
import {
  ANONYMOUS_PATHS, API_BASE, CLIENT_HEADER, accessToken, adopt, forget, needsRefresh, refresh,
} from './session'
import type { AuthResponse } from './contracts'

/**
 * The single way this site talks to the API.
 *
 * It is a direct port of the Flutter app's Dio interceptor chain, because two clients that
 * disagree about when to refresh a token will eventually disagree about whether a user is signed
 * in. The order below is the order there:
 *
 *   1. path assertion — catch a doubled `/api/v1` at the call site, not in production
 *   2. locale        — tell the server which language to render money and text in
 *   3. auth          — refresh proactively, attach the token, retry once on a 401
 *
 * What is deliberately *not* ported: `FlutterSecureStorage`. The mobile app's refresh token lives
 * in the OS keychain; this site's lives in an HttpOnly cookie it cannot read. See `session.ts`.
 */

export type Locale = 'bn-BD' | 'en-US'

let locale: Locale = 'bn-BD'

/**
 * Sets the language for every subsequent request.
 *
 * This is not cosmetic. Listing names, category names and the `display` field of every price are
 * rendered server-side from the `i18n.translation` table, so the language of a request decides the
 * language of the data, not merely of the chrome around it.
 */
export function setLocale(next: Locale) {
  locale = next
}

export function getLocale(): Locale {
  return locale
}

/** Fired when a session ends for good, so the UI can drop to its signed-out state. */
let onSignedOut: (() => void) | null = null

export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Appended as a query string; `undefined` and `null` values are dropped, not sent empty. */
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** Set for calls that must go out unauthenticated even when a session exists. */
  anonymous?: boolean
}

function assertPath(path: string) {
  if (!path.startsWith('/api/v1/')) {
    throw new Error(`Path must start with /api/v1/ — got "${path}"`)
  }
  // The mistake this catches: writing `/api/v1/orders` against a base URL that already ends in
  // `/api/v1`. The result is a 404 whose message says nothing about the doubled prefix, and it
  // reliably costs an afternoon. The Flutter client has the same guard for the same reason.
  if (path.startsWith('/api/v1/api/')) {
    throw new Error(`Doubled API prefix in "${path}"`)
  }
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(API_BASE + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  // The locale goes in the query string as well as the header, and it has to.
  //
  // The API resolves locale as `?locale=` -> the signed-in user's saved preference ->
  // `Accept-Language` -> bn-BD. The header therefore loses to the profile: a user whose account
  // says bn-BD saw Bengali product names and Bengali-numeral prices no matter what the language
  // toggle said, and only once signed in, which made it look like a login bug rather than a locale
  // one. The query parameter is the only rung above the profile, so the toggle has to use it.
  if (!url.searchParams.has('locale')) url.searchParams.set('locale', locale)
  return url.toString()
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': locale,
    [CLIENT_HEADER]: 'web',
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    // Always included so the refresh cookie reaches `/api/v1/auth`. The cookie is scoped to that
    // path by the server, so no other endpoint actually receives one.
    credentials: 'include',
    signal: options.signal,
  })
}

/**
 * Performs a request, refreshing the access token around it as needed.
 *
 * Two refreshes, doing different jobs:
 *
 *   * **Before** the request, when the token is expired or nearly so. This is the common case and
 *     it avoids a guaranteed-to-fail round trip.
 *   * **After** a 401, once. A token can be rejected while still looking valid here — a revoked
 *     membership, a signing key rotation, a clock further out than the skew allows. Retrying once
 *     turns that into a recoverable blip; retrying more than once turns a genuinely dead session
 *     into a loop.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  assertPath(path)
  const anonymous = options.anonymous || ANONYMOUS_PATHS.includes(path)

  if (!anonymous && needsRefresh() && accessToken() !== null) {
    await refresh()
  }

  let response: Response
  try {
    response = await send(path, options, anonymous ? null : accessToken())
  } catch (cause) {
    throw networkError(cause)
  }

  if (response.status === 401 && !anonymous) {
    if (await refresh()) {
      try {
        response = await send(path, options, accessToken())
      } catch (cause) {
        throw networkError(cause)
      }
    } else {
      // The refresh itself failed, so the session is over rather than merely stale. Say so once,
      // here, instead of letting every screen invent its own "please sign in again".
      forget()
      onSignedOut?.()
      throw await toApiError(response)
    }
  }

  if (!response.ok) throw await toApiError(response)

  // 204, and any other body-less success. Callers that expect nothing type T as void.
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

/**
 * Turns the API's relative media paths into something an `<img>` can load.
 *
 * The API returns `/api/v1/media/{id}` rather than an absolute URL, which is right — it does not
 * know what host a client reached it on. It does mean every image path needs this on the way out,
 * and it means an already-absolute URL must pass through untouched.
 */
export function mediaUrl(
  path: string | null | undefined,
  /**
   * Ask the API for a downscaled preview.
   *
   * Worth being deliberate about: a shop grid renders cards a couple of hundred pixels wide, and
   * the photographs behind them are whatever came off a phone. Sending the full image to fill a
   * 240px box wastes most of what it downloads, and this site's users are on mobile data in rural
   * Bangladesh — the difference is the page loading or not. The full image is for the product page,
   * where it is actually looked at.
   */
  thumbnail = false,
): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return API_BASE + path + (thumbnail ? '?thumb=true' : '')
}

/** Signs in and adopts the returned session. */
export async function signIn(identifier: string, password: string): Promise<AuthResponse> {
  const auth = await request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { identifier, password },
    anonymous: true,
  })
  adopt(auth)
  return auth
}

export async function register(fullName: string, identifier: string, password: string) {
  const auth = await request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: { fullName, identifier, password, locale },
    anonymous: true,
  })
  adopt(auth)
  return auth
}

/**
 * Signs out.
 *
 * The local session is dropped whatever the server says. A logout that appears to fail because the
 * revocation call timed out leaves the user staring at their own account page, which is worse than
 * a refresh token that stays valid a few minutes longer on a server they can no longer reach.
 */
export async function signOut() {
  try {
    await request<void>('/api/v1/auth/logout', { method: 'POST', body: {} })
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
  } finally {
    forget()
  }
}
