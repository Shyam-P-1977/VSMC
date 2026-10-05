import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../api'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    if (!tokenStore.get()) return
    api.auth
      .me()
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null)
    }
    window.addEventListener('vscms:logout', onForcedLogout)
    return () => window.removeEventListener('vscms:logout', onForcedLogout)
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await api.auth.login({ email, password })
    tokenStore.set(d.token)
    setUser(d.user)
    return d.user
  }, [])

  const register = useCallback(async (payload) => {
    const d = await api.auth.register(payload)
    tokenStore.set(d.token)
    setUser(d.user)
    return d.user
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
