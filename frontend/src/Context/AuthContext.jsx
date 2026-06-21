/* eslint-disable react-refresh/only-export-components */
import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const AUTH_STORAGE_KEY = 'jackCoursesAuth'

export const ROLE_HOME_PATHS = {
  admin: '/admin/home',
  faculty: '/faculty/home',
  user: '/user/home',
}

const ROLE_PATH_PREFIXES = {
  admin: '/admin',
  faculty: '/faculty',
  user: '/user',
}

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

export const isPathAllowedForRole = (pathname, role) => {
  const pathPrefix = ROLE_PATH_PREFIXES[role]

  if (!pathPrefix || !pathname) {
    return false
  }

  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`)
}

export const getPostAuthRedirectPath = (role, fromLocation) => {
  const homePath = ROLE_HOME_PATHS[role] || '/'
  const pathname = fromLocation?.pathname

  if (!isPathAllowedForRole(pathname, role)) {
    return homePath
  }

  return `${pathname}${fromLocation?.search || ''}${fromLocation?.hash || ''}`
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

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if ([401, 403].includes(error?.response?.status)) {
          clearAuth()
        }

        return Promise.reject(error)
      },
    )

    return () => {
      axios.interceptors.response.eject(interceptorId)
    }
  }, [clearAuth])

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
