import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const FacultyHomePage = () => {
  const navigate = useNavigate()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [facultyName, setFacultyName] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let isActive = true

    const verifyFaculty = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/faculty/profile`, {
          withCredentials: true,
        })

        const faculty = response.data?.data?.faculty

        if (!response.data?.success || faculty?.role !== 'faculty') {
          throw new Error('Unauthorized faculty')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'faculty',
          phone: faculty.phone,
          token: null,
        })
        setFacultyName(faculty.name || '')
        setIsAuthorized(true)
      } catch {
        if (!isActive) {
          return
        }

        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyFaculty()

    return () => {
      isActive = false
    }
  }, [clearAuth, setAuth])

  const handleLogout = async () => {
    setLoggingOut(true)
    setLogoutError('')

    try {
      await Promise.all([
        axios.post(`${API_BASE_URL}/faculty/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/admin/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/user/logout`, {}, {
          withCredentials: true,
        }),
      ])

      clearAuth()
      navigate('/login', { replace: true })
    } catch (logoutRequestError) {
      setLogoutError(logoutRequestError?.response?.data?.message || 'Unable to logout. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm font-semibold text-slate-600">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/faculty/home" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-lg font-bold text-white">J</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Faculty Home
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {logoutError ? (
              <span className="hidden text-sm font-medium text-red-600 sm:inline">
                {logoutError}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
        {logoutError ? (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 sm:hidden">
            {logoutError}
          </div>
        ) : null}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Faculty Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Welcome, {facultyName || auth.phone}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            You are logged in as a faculty member.
          </p>
        </section>
      </main>
    </div>
  )
}

export default FacultyHomePage
