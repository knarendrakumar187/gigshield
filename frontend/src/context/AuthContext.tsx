import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import client from '../api/client'

export type User = {
  id: number
  username: string
  role: string
  city: string
  zone: string
  platform: string
  avg_daily_earnings: string
  upi_id: string
  first_name?: string
}

type Ctx = {
  user: User | null
  loading: boolean
  login: (u: string, p: string) => Promise<string | null>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const t = localStorage.getItem('access')
    if (!t) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await client.get('/api/auth/profile/')
      setUser(data)
    } catch {
      setUser(null)
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await client.post('/api/auth/login/', { username, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    if (data.user) {
      setUser(data.user)
    } else {
      await refreshProfile()
    }
    return (data.user?.role as string) || null
  }, [refreshProfile])

  const logout = useCallback(() => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }, [])

  const v = useMemo(() => ({ user, loading, login, logout, refreshProfile }), [user, loading, login, logout, refreshProfile])
  return <AuthContext.Provider value={v}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const x = useContext(AuthContext)
  if (!x) throw new Error('useAuth')
  return x
}
