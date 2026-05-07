/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const AUTH_STORAGE_KEY = 'jackCoursesAuth'

const emptyAuth = {
  role: null,
  phone: '',
  token: null,
}

const getStoredAuth = () => {
  try {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedAuth) {
      return emptyAuth
    }

    const parsedAuth = JSON.parse(storedAuth)

    if (!parsedAuth?.role || !parsedAuth?.phone) {
      return emptyAuth
    }

    return {
      role: parsedAuth.role,
      phone: parsedAuth.phone,
      token: null,
    }
  } catch {
    return emptyAuth
  }
}

export const AuthProvider = ({ children }) => {
  const [auth, setAuthState] = useState(getStoredAuth)

  const setAuth = useCallback((nextAuth) => {
    const normalizedAuth = {
      role: nextAuth?.role || null,
      phone: nextAuth?.phone || '',
      token: null,
    }

    setAuthState(normalizedAuth)

    if (normalizedAuth.role && normalizedAuth.phone) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedAuth))
      return
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const clearAuth = useCallback(() => {
    setAuthState(emptyAuth)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({
    auth,
    setAuth,
    clearAuth,
  }), [auth, clearAuth, setAuth])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
