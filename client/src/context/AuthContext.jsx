import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { API_URL as API } from '../config'

const AuthContext = createContext(null)

// Decodifica el payload JWT sin verificar la firma (solo para leer expiración en cliente)
function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const refreshTimerRef   = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function clearRefreshTimer() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  const logout = useCallback(() => {
    const rt = localStorage.getItem('refreshToken')
    if (rt) {
      // Invalidar refresh token en el servidor (fire-and-forget)
      fetch(`${API}/auth/logout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt }),
      }).catch(() => {})
    }
    clearRefreshTimer()
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setToken(null)
  }, [])

  // Llama a /auth/refresh, actualiza ambos tokens y devuelve el nuevo access token
  const tryRefresh = useCallback(async () => {
    const rt = localStorage.getItem('refreshToken')
    if (!rt) { logout(); return null }
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) { logout(); return null }
      const { accessToken, refreshToken } = await res.json()
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setToken(accessToken)
      return accessToken
    } catch {
      logout()
      return null
    }
  }, [logout])

  // Programa el próximo refresco 60 s antes de que expire el access token
  const scheduleRefresh = useCallback((accessToken) => {
    clearRefreshTimer()
    const payload = decodeJwt(accessToken)
    if (!payload?.exp) return
    const msUntilExpiry = payload.exp * 1000 - Date.now()
    const delay = Math.max(msUntilExpiry - 60_000, 0) // refresca 1 min antes
    refreshTimerRef.current = setTimeout(tryRefresh, delay)
  }, [tryRefresh])

  // ── Login ────────────────────────────────────────────────────────────────

  function login(accessToken, refreshToken) {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setToken(accessToken)
  }

  // ── Efectos ──────────────────────────────────────────────────────────────

  // Al montar: si el access token está expirado, intenta refrescar inmediatamente
  useEffect(() => {
    if (!token) return
    const payload = decodeJwt(token)
    if (!payload) { logout(); return }

    if (payload.exp * 1000 <= Date.now()) {
      // Token ya expiró — refrescar ahora
      tryRefresh().then(newToken => { if (newToken) scheduleRefresh(newToken) })
    } else {
      scheduleRefresh(token)
    }
    return clearRefreshTimer
  }, [token, logout, tryRefresh, scheduleRefresh])

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

