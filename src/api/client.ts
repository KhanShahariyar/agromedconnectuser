import { ApiError, networkError, toApiError } from './problem'
import {
  ANONYMOUS_PATHS, API_BASE, CLIENT_HEADER, accessToken, adopt, forget, needsRefresh, refresh,
} from './session'
import type { AuthResponse } from './contracts'

export type Locale = 'bn-BD' | 'en-US'

let locale: Locale = 'bn-BD'

export function setLocale(next: Locale) {
  locale = next
}

export function getLocale(): Locale {
  return locale
}

let onSignedOut: (() => void) | null = null

export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown

  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  headers?: Record<string, string>

  anonymous?: boolean
}

function assertPath(path: string) {
  if (!path.startsWith('/api/v1/')) {
    throw new Error(`Path must start with /api/v1/ — got "${path}"`)
  }

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

  if (!url.searchParams.has('locale')) url.searchParams.set('locale', locale)
  return url.toString()
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': locale,
    [CLIENT_HEADER]: 'web',
  }
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  Object.assign(headers, options.headers)

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : isForm ? options.body as FormData : JSON.stringify(options.body),

    credentials: 'include',
    signal: options.signal,
  })
}

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

      forget()
      onSignedOut?.()
      throw await toApiError(response)
    }
  }

  if (!response.ok) throw await toApiError(response)

  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export function mediaUrl(
  path: string | null | undefined,

  thumbnail = false,
): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return API_BASE + path + (thumbnail ? '?thumb=true' : '')
}

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

export async function signOut() {
  try {
    await request<void>('/api/v1/auth/logout', { method: 'POST', body: {} })
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
  } finally {
    forget()
  }
}
