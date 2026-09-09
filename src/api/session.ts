import type { AuthResponse, User } from './contracts'

/**
 * Where the credentials live, and why they live there.
 *
 * ## The access token is in memory and nowhere else
 *
 * Not `localStorage`, not `sessionStorage`, not a readable cookie. Anything JavaScript can read,
 * a cross-site-scripting bug can read too — one injected script and the attacker holds a token
 * that authenticates as this user for its full lifetime. A module-level variable is not immune to
 * XSS, but it is only reachable by script running *now*, in this tab: nothing is left behind for
 * a later injection to find, and nothing is shared with any other origin the browser talks to.
 *
 * The cost is that a page reload loses it, which is fine — see the boot sequence below.
 *
 * ## The refresh token is in an HttpOnly cookie the site cannot see
 *
 * That is the whole reason the API gained cookie support. A thirty-day refresh token in web
 * storage is a far worse thing to lose than a fifteen-minute access token, so it is kept in the
 * one place a browser offers that script cannot reach. This module never touches it; the browser
 * attaches it to `/api/v1/auth` calls on its own, which is why every request here sets
 * `credentials: 'include'`.
 *
 * ## Boot
 *
 * On load there is no access token. {@link restore} calls the refresh endpoint with nothing but
 * the cookie; if the cookie is alive the user is signed in again without seeing a login form, and
 * if it is not the call 401s and the site renders as anonymous. Either way the answer comes from
 * the server, so a revoked session cannot be faked by editing client storage.
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5270'

/**
 * Trailing slashes are stripped once, here.
 *
 * `${base}${path}` with a base ending in `/` and a path starting with `/` yields `//api/v1/...`,
 * which some servers route and some 404, and the difference only shows up in whichever
 * environment set the variable with a trailing slash.
 */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

/**
 * Sent on every request so the API honours the cookie as a credential.
 *
 * Its value is irrelevant; its presence is the point. This is not a CORS-safelisted header, so a
 * browser refuses to send it cross-origin without first winning a preflight against the API's
 * allow-list — which means an attacker's page cannot forge a request that carries it. That is what
 * makes the cookie safe from cross-site request forgery, and it must match the constant the API
 * checks (`RefreshTokenCookie.ClientHeader`).
 */
export const CLIENT_HEADER = 'X-AgroMed-Client'

/**
 * Endpoints that must never carry an Authorization header, and must never trigger a refresh.
 *
 * Attaching an expired token to a login attempt turns a clean 401-from-bad-password into an
 * ambiguous one, and refreshing on a failed refresh is an infinite loop. This list matches the
 * Flutter client's exactly — the two clients talk to the same endpoints and must agree about which
 * of them are anonymous.
 */
export const ANONYMOUS_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/otp/request',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/token/refresh',
  '/api/v1/auth/password/forgot',
  '/api/v1/auth/password/reset',
]

/**
 * Refresh this long before the token actually expires.
 *
 * Without the skew a token that expires in two seconds is treated as valid, sent, and rejected —
 * costing a wasted round trip and a retry on a slow connection, which is exactly when users are
 * least able to absorb one. Thirty seconds also covers a clock a little out of step with the
 * server's, since expiry is compared against the browser's idea of now.
 */
const EXPIRY_SKEW_MS = 30_000

interface SessionState {
  accessToken: string
  expiresAt: number
  user: User
}

let state: SessionState | null = null
let listeners: ((user: User | null) => void)[] = []

/** In-tab serialisation: a second caller awaits the first rather than starting its own rotation. */
let inFlightRefresh: Promise<boolean> | null = null

function emit() {
  const user = state?.user ?? null
  for (const listener of listeners) listener(user)
}

export function subscribe(listener: (user: User | null) => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function currentUser(): User | null {
  return state?.user ?? null
}

export function adopt(auth: AuthResponse) {
  state = {
    accessToken: auth.accessToken,
    expiresAt: Date.parse(auth.expiresAt),
    user: auth.user,
  }
  emit()
}

export function forget() {
  state = null
  emit()
}

/** True when the token is missing, expired, or close enough to expiry to be worth replacing. */
export function needsRefresh(): boolean {
  return state === null || Date.now() >= state.expiresAt - EXPIRY_SKEW_MS
}

export function accessToken(): string | null {
  return state?.accessToken ?? null
}

async function rotate(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/token/refresh`, {
      method: 'POST',
      // The empty object matters: the endpoint's body is optional, and sending nothing at all
      // would leave the request without a content type some proxies insist on.
      body: '{}',
      headers: { 'Content-Type': 'application/json', [CLIENT_HEADER]: 'web' },
      // Without this the browser sends no cookie and the call can only ever 401.
      credentials: 'include',
    })
    if (!response.ok) {
      forget()
      return false
    }
    adopt((await response.json()) as AuthResponse)
    return true
  } catch {
    // A network failure is not proof the session is dead, so the token is left alone: the caller
    // will surface a transient error and the next attempt may well succeed.
    return false
  }
}

/**
 * Rotates the refresh token, at most once at a time across every tab.
 *
 * ## Why a cross-tab lock and not just a promise
 *
 * Refresh tokens are single-use and the API treats a replayed one as theft, revoking the entire
 * token family. Two tabs restoring their session on the same reload both hold the same cookie:
 * whichever loses the race presents an already-rotated token, and the server — correctly, by its
 * own rules — signs the user out of everywhere. The user sees a random logout that no single tab's
 * code can explain.
 *
 * `inFlightRefresh` solves this within a tab. The Web Locks API solves it between tabs, which a
 * promise cannot reach. Once a waiting tab acquires the lock the cookie already holds the *next*
 * token, so its own rotation is a legitimate, non-replayed call.
 *
 * Where `navigator.locks` is unavailable the promise alone is used. That is strictly worse than
 * nothing only if it throws, so it does not: a single-tab user is unaffected, and a multi-tab user
 * on a browser that old is back to the race this method exists to prevent.
 */
export async function refresh(): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh

  const run = async () => {
    if (!navigator.locks) return rotate()
    return navigator.locks.request('agromed-refresh', async () => {
      // Re-checked inside the lock. Another tab may have rotated while this one queued, in which
      // case its cookie is already fresh and rotating again would burn a token for nothing.
      if (!needsRefresh()) return true
      return rotate()
    })
  }

  inFlightRefresh = run().finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}

/**
 * Restores a session from the cookie on page load.
 *
 * Distinguishes "signed out" from "could not tell": a 401 means no valid cookie and the site
 * renders anonymously, while a network failure leaves the user unknown rather than silently
 * demoting them to signed-out and wiping their basket view.
 */
export async function restore(): Promise<User | null> {
  await refresh()
  return currentUser()
}
