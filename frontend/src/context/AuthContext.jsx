import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import api from '../services/api'

const AuthContext = createContext(null)

const STORAGE_TOKEN_KEY = 'token'
const STORAGE_USER_KEY = 'user'

const readStoredUser = () => {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_USER_KEY
      )

    return raw
      ? JSON.parse(raw)
      : null
  } catch {
    return null
  }
}

const persistSession = (
  token,
  user
) => {
  localStorage.setItem(
    STORAGE_TOKEN_KEY,
    token
  )

  localStorage.setItem(
    STORAGE_USER_KEY,
    JSON.stringify(user)
  )
}

const clearSession = () => {
  localStorage.removeItem(
    STORAGE_TOKEN_KEY
  )

  localStorage.removeItem(
    STORAGE_USER_KEY
  )
}

const AuthProvider = ({
  children,
}) => {
  const [token, setToken] =
    useState(() =>
      localStorage.getItem(
        STORAGE_TOKEN_KEY
      )
    )

  const [user, setUser] =
    useState(readStoredUser)

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    let cancelled = false

    const verifyStoredToken =
      async () => {
        if (!token) {
          setLoading(false)
          return
        }

        try {
          const { data } =
            await api.get(
              '/auth/me'
            )

          if (!cancelled) {
            setUser(data.user)

            localStorage.setItem(
              STORAGE_USER_KEY,
              JSON.stringify(
                data.user
              )
            )
          }
        } catch {
          if (!cancelled) {
            clearSession()

            setToken(null)
            setUser(null)
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

    verifyStoredToken()

    return () => {
      cancelled = true
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * LOGIN
   */
  const login = async (
    email,
    password
  ) => {
    const { data } =
      await api.post(
        '/auth/login',
        {
          email,
          password,
        }
      )

    persistSession(
      data.token,
      data.user
    )

    setToken(data.token)
    setUser(data.user)

    return data.user
  }

  /*
   * REGISTER
   *
   * role can be:
   * - customer
   * - supplier
   *
   * Registration does NOT create a session.
   */
  const register = async (
    name,
    email,
    password,
    role = 'customer'
  ) => {
    const { data } =
      await api.post(
        '/auth/register',
        {
          name,
          email,
          password,
          role,
        }
      )

    /*
     * DO NOT call persistSession().
     *
     * The user must login separately.
     */
    return data
  }

  /*
   * LOGOUT
   */
  const logout = () => {
    clearSession()

    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,

    isAuthenticated:
      Boolean(token && user),

    loading,

    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}

const useAuth = () => {
  const ctx =
    useContext(AuthContext)

  if (!ctx) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }

  return ctx
}

export {
  AuthProvider,
  useAuth,
}