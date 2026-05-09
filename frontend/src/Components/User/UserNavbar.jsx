import axios from 'axios'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getNavLinkClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${
  isActive
    ? 'bg-blue-50 text-blue-700'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
}`

const UserNavbar = () => {
  const navigate = useNavigate()
  const { clearAuth } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([
        axios.post(`${API_BASE_URL}/user/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/admin/logout`, {}, {
          withCredentials: true,
        }),
      ])

      clearAuth()
      navigate('/login', { replace: true })
    } catch (logoutError) {
      setError(logoutError?.response?.data?.message || 'Unable to logout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/user/home" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-lg font-bold text-white">J</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            User Home
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <NavLink to="/user/home" className={getNavLinkClass}>
              Home
            </NavLink>
            <NavLink to="/user/courses" className={getNavLinkClass}>
              Courses
            </NavLink>
          </div>
          {error ? (
            <span className="hidden text-sm font-medium text-red-600 sm:inline">
              {error}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
      <div className="flex border-t border-slate-100 px-4 py-2 sm:hidden">
        <NavLink to="/user/home" className={getNavLinkClass}>
          Home
        </NavLink>
        <NavLink to="/user/courses" className={getNavLinkClass}>
          Courses
        </NavLink>
      </div>
      {error ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 sm:hidden">
          {error}
        </div>
      ) : null}
    </nav>
  )
}

export default UserNavbar
