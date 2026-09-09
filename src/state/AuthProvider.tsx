import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api/client'
import { currentUser, restore, subscribe } from '../api/session'
import type { User } from '../api/contracts'

/**
 * Who is signed in, for the whole app.
 *
 * `status` distinguishes three things a boolean cannot. On first paint the answer is genuinely
 * unknown — the refresh cookie is being redeemed — and rendering "Sign in" during that moment
 * makes the header flicker from signed-out to signed-in on every reload. `restoring` holds that
 * flicker back.
 */
type AuthStatus = 'restoring' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  signIn: (identifier: string, password: string) => Promise<void>
  register: (fullName: string, identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(currentUser)
  const [restoring, setRestoring] = useState(true)

  // The session module is the single source of truth: a refresh triggered by any request in the
  // app updates it, and this subscription is how that reaches React. Setting state from the login
  // call alone would miss the token rotations that happen on their own.
  useEffect(() => subscribe(setUser), [])

  useEffect(() => {
    let cancelled = false
    // The signed-out handler fires when a refresh finally fails mid-session, which is the one case
    // where the user is ejected without asking to be.
    api.setSignedOutHandler(() => setUser(null))
    restore().finally(() => {
      if (!cancelled) setRestoring(false)
    })
    return () => {
      cancelled = true
      api.setSignedOutHandler(null)
    }
  }, [])

  const signIn = useCallback(async (identifier: string, password: string) => {
    await api.signIn(identifier, password)
  }, [])

  const register = useCallback(async (fullName: string, identifier: string, password: string) => {
    await api.register(fullName, identifier, password)
  }, [])

  const signOut = useCallback(async () => {
    await api.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: restoring ? 'restoring' : user ? 'authenticated' : 'anonymous',
      user,
      signIn,
      register,
      signOut,
    }),
    [restoring, user, signIn, register, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
