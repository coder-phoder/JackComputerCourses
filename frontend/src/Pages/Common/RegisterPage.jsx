import axios from 'axios'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PasswordInput from '../../Components/Common/PasswordInput'
import ThemeToggle from '../../Components/Common/ThemeToggle'
import { getPostAuthRedirectPath, useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const getErrorMessage = (error) => (
  error?.response?.data?.message || 'Unable to register. Please try again.'
)

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearAuth, setAuth } = useAuth()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const clearExistingSessions = async () => {
    await Promise.all([
      axios.post(`${API_BASE_URL}/admin/logout`, {}, {
        withCredentials: true,
      }),
      axios.post(`${API_BASE_URL}/user/logout`, {}, {
        withCredentials: true,
      }),
    ])

    clearAuth()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = form.name.trim()
    const phone = form.phone.trim()
    const password = form.password

    if (!name || !phone || !password) {
      setError('Name, phone and password are required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await clearExistingSessions()

      const response = await axios.post(`${API_BASE_URL}/user/register`, {
        name,
        phone,
        password,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Registration failed')
      }

      const user = response.data?.data?.user

      setAuth({
        role: 'user',
        phone: user?.phone || phone,
        token: null,
      })
      navigate(getPostAuthRedirectPath('user', location.state?.from), { replace: true })
    } catch (registerError) {
      setError(getErrorMessage(registerError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-tr from-blue-600 to-indigo-600">
                <span className="text-xl font-bold text-white">J</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
                Jack<span className="text-blue-600">Courses</span>
              </span>
            </Link>
            <h1 className="mt-8 text-3xl font-bold text-slate-900 dark:text-slate-100">Create Account</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Register with your name, phone number and password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                placeholder="Enter your name"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Phone
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                placeholder="Enter phone number"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </label>
              <PasswordInput
                id="register-password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm Password
              </label>
              <PasswordInput
                id="register-confirm-password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                placeholder="Confirm password"
                disabled={loading}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Already have an account?{' '}
            <Link to="/login" state={location.state} className="font-semibold text-blue-600 transition hover:text-blue-700 dark:hover:text-blue-300">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
