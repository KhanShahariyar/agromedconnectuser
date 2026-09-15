import type { AuthResponse, User } from './contracts'

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5270'

export const API_BASE = RAW_BASE.replace(/\/+$/, '')

export const CLIENT_HEADER = 'X-AgroMed-Client'

export const ANONYMOUS_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/otp/request',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/token/refresh',
  '/api/v1/auth/password/forgot',
  '/api/v1/auth/password/reset',
]

const EXPIRY_SKEW_MS = 30_000

interface SessionState {
  accessToken: string
  expiresAt: number
  user: User
}

let state: SessionState | null = null
let listeners: ((user: User | null) => void)[] = []

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

      body: '{}',
      headers: { 'Content-Type': 'application/json', [CLIENT_HEADER]: 'web' },

      credentials: 'include',
    })
    if (!response.ok) {
      forget()
      return false
    }
    adopt((await response.json()) as AuthResponse)
    return true
  } catch {

    return false
  }
}

export async function refresh(): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh

  const run = async () => {
    if (!navigator.locks) return rotate()
    return navigator.locks.request('agromed-refresh', async () => {

      if (!needsRefresh()) return true
      return rotate()
    })
  }

  inFlightRefresh = run().finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}

export async function restore(): Promise<User | null> {
  await refresh()
  return currentUser()
}
