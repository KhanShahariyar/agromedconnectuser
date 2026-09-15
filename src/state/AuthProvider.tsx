import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api/client'
import { unregisterPush } from '../push'
import { currentUser, restore, subscribe } from '../api/session'
import type { User } from '../api/contracts'

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

  useEffect(() => subscribe(setUser), [])

  useEffect(() => {
    let cancelled = false

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

    await unregisterPush()
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
