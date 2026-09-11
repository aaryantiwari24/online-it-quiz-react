import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

const STORAGE_TOKEN_KEY = 'token'
const STORAGE_USER_KEY = 'user'

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // A corrupted/hand-edited localStorage value shouldn't crash the app
    // on load — treat it the same as "nothing stored".
    return null
  }
}

const persistSession = (token, user) => {
  localStorage.setItem(STORAGE_TOKEN_KEY, token)
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
}

const clearSession = () => {
  localStorage.removeItem(STORAGE_TOKEN_KEY)
  localStorage.removeItem(STORAGE_USER_KEY)
}

/**
 * Auth state for the whole app — JWT + current user, backed by
 * localStorage so a page refresh doesn't log anyone out. `login`/
 * `register` call the Phase 2 endpoints via the shared `api` instance
 * (services/api.js) and store whatever they return.
 *
 * On mount, if a token is already stored, it's re-verified against
 * GET /api/auth/me (the Phase 2 debug route) rather than trusted as-is —
 * this both confirms the token hasn't expired and refreshes `user` in
 * case the account changed since the last login. `loading` stays true
 * until that check resolves, so ProtectedRoute (components/shared) can
 * wait for it instead of bouncing an already-logged-in user to /login for
 * one frame while the check is still in flight.
 */
const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY))
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const verifyStoredToken = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const { data } = await api.get('/auth/me')
        if (!cancelled) {
          setUser(data.user)
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user))
        }
      } catch {
        // Expired/invalid/no-longer-existing account — same treatment as
        // an explicit logout, so the rest of the app only ever sees a
        // clean "logged out" state, never a stale one.
        if (!cancelled) {
          clearSession()
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verifyStoredToken()

    return () => {
      cancelled = true
    }
    // Intentionally empty — this is a one-time check on mount. A token set
    // via login()/register() below is already fresh from the server and
    // doesn't need re-verifying against itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    persistSession(data.token, data.user)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  // Public self-registration is always role: 'customer' here — matches
  // context.md Section 2's "Student Register" page and authController.js's
  // own comment that the frontend register page never sends anything
  // else. Admin/supplier accounts are provisioned separately (seeding, or
  // a future admin-only endpoint), not through this form.
  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      role: 'customer',
    })
    persistSession(data.token, data.user)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearSession()
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Small hook wrapper so pages import `useAuth` instead of `useContext` +
 * `AuthContext` separately, and get a clear error if it's ever used
 * outside `<AuthProvider>` instead of a silent `null`.
 */
const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export { AuthProvider, useAuth }
